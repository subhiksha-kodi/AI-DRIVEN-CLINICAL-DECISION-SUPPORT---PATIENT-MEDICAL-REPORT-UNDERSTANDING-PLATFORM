/**
 * ehr.controller.js - Admin EHR Analysis: Excel upload, display, edit
 */
const XLSX = require('xlsx');
const fs = require('fs');
const EhrPatient = require('../models/EhrPatient');

// Column mapping from Excel headers to database fields
const COLUMN_MAPPING = {
  'patient_id': 'patient_id',
  'patientid': 'patient_id',
  'patient id': 'patient_id',
  'age': 'age',
  'gender': 'gender',
  'race': 'race',
  'ethnicity': 'ethnicity',
  'marital_status': 'marital_status',
  'marital status': 'marital_status',
  'city': 'city',
  'state': 'state',
  'zip': 'zip',
  'total_encounters': 'total_encounters',
  'total encounters': 'total_encounters',
  'emergency_visits': 'emergency_visits',
  'emergency visits': 'emergency_visits',
  'inpatient_visits': 'inpatient_visits',
  'inpatient visits': 'inpatient_visits',
  'outpatient_visits': 'outpatient_visits',
  'outpatient visits': 'outpatient_visits',
  'wellness_visits': 'wellness_visits',
  'wellness visits': 'wellness_visits',
  'ambulatory_visits': 'ambulatory_visits',
  'ambulatory visits': 'ambulatory_visits',
  'total_conditions': 'total_conditions',
  'total conditions': 'total_conditions',
  'chronic_conditions': 'chronic_conditions',
  'chronic conditions': 'chronic_conditions',
  'unique_condition_codes': 'unique_condition_codes',
  'unique condition codes': 'unique_condition_codes',
  'unique_condition_descriptions': 'unique_condition_descriptions',
  'unique condition descriptions': 'unique_condition_descriptions',
  'total_medications': 'total_medications',
  'total medications': 'total_medications',
  'unique_medications': 'unique_medications',
  'unique medications': 'unique_medications',
  'unique_medication_descriptions': 'unique_medication_descriptions',
  'unique medication descriptions': 'unique_medication_descriptions',
  'total_dispenses': 'total_dispenses',
  'total dispenses': 'total_dispenses',
  'total_procedures': 'total_procedures',
  'total procedures': 'total_procedures',
  'total_allergies': 'total_allergies',
  'total allergies': 'total_allergies',
  'total_observations': 'total_observations',
  'total observations': 'total_observations',
  'total_imaging_studies': 'total_imaging_studies',
  'total imaging studies': 'total_imaging_studies',
  'total_immunizations': 'total_immunizations',
  'total immunizations': 'total_immunizations',
  'total_careplans': 'total_careplans',
  'total careplans': 'total_careplans',
  'total_supplies': 'total_supplies',
  'total supplies': 'total_supplies',
  'total_devices': 'total_devices',
  'total devices': 'total_devices',
  'total_encounter_costs': 'total_encounter_costs',
  'total encounter costs': 'total_encounter_costs',
  'total_base_encounter_costs': 'total_base_encounter_costs',
  'total base encounter costs': 'total_base_encounter_costs',
  'total_payer_coverage_encounters': 'total_payer_coverage_encounters',
  'total payer coverage encounters': 'total_payer_coverage_encounters',
  'total_medication_costs': 'total_medication_costs',
  'total medication costs': 'total_medication_costs',
  'total_base_medication_costs': 'total_base_medication_costs',
  'total base medication costs': 'total_base_medication_costs',
  'total_payer_coverage_medications': 'total_payer_coverage_medications',
  'total payer coverage medications': 'total_payer_coverage_medications',
};

/**
 * Map Excel header to database field
 */
const mapColumnName = (header) => {
  const normalized = header.toLowerCase().trim();
  return COLUMN_MAPPING[normalized] || normalized.replace(/\s+/g, '_');
};

/**
 * Integer fields that need to be rounded/converted
 */
const INTEGER_FIELDS = [
  'age', 'total_encounters', 'emergency_visits', 'inpatient_visits',
  'outpatient_visits', 'wellness_visits', 'ambulatory_visits',
  'total_conditions', 'chronic_conditions', 'total_medications',
  'unique_medications', 'total_dispenses', 'total_procedures',
  'total_allergies', 'total_observations', 'total_imaging_studies',
  'total_immunizations', 'total_careplans', 'total_supplies', 'total_devices'
];

/**
 * Sanitize row data - convert numeric strings and handle decimals for integer fields
 */
const sanitizeRowData = (row) => {
  const sanitized = { ...row };
  
  for (const field of INTEGER_FIELDS) {
    if (sanitized[field] !== undefined && sanitized[field] !== null) {
      const value = sanitized[field];
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        sanitized[field] = isNaN(parsed) ? null : Math.round(parsed);
      } else if (typeof value === 'number') {
        sanitized[field] = Math.round(value);
      }
    }
  }
  
  return sanitized;
};

/**
 * POST /api/admin/ehr/upload
 * Upload Excel file and parse into database
 */
const uploadEhrExcel = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const filePath = req.file.path;
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    if (rawData.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ success: false, message: 'Excel file is empty.' });
    }

    // Map columns and prepare data
    const mappedData = rawData.map(row => {
      const mappedRow = {};
      Object.keys(row).forEach(key => {
        const dbField = mapColumnName(key);
        mappedRow[dbField] = row[key];
      });
      return mappedRow;
    });

    // Validate patient_id exists
    const invalidRows = mappedData.filter(row => !row.patient_id);
    if (invalidRows.length > 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: `${invalidRows.length} rows missing patient_id.`,
      });
    }

    // Upsert each row into database
    let processed = 0;
    const errors = [];

    for (const rawRow of mappedData) {
      try {
        // Sanitize the row data (convert decimals to integers for integer fields)
        const row = sanitizeRowData(rawRow);
        
        // Ensure patient_id is a string
        row.patient_id = String(row.patient_id);
        
        // Check if patient exists
        const existing = await EhrPatient.findOne({ where: { patient_id: row.patient_id } });
        
        if (existing) {
          await existing.update(row);
        } else {
          await EhrPatient.create(row);
        }
        processed++;
      } catch (err) {
        console.error(`Error processing patient ${row.patient_id}:`, err.message);
        errors.push({ patient_id: row.patient_id, error: err.message });
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    console.log(`EHR Upload: Processed ${processed}/${mappedData.length} records. Errors: ${errors.length}`);

    return res.json({
      success: true,
      message: `Processed ${processed} of ${mappedData.length} records successfully.${errors.length > 0 ? ` ${errors.length} errors.` : ''}`,
      data: { total: mappedData.length, processed, errors: errors.slice(0, 10) },
    });
  } catch (err) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(err);
  }
};

/**
 * GET /api/admin/ehr/patients
 * Get all EHR patients with pagination
 */
const getEhrPatients = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const whereClause = search
      ? {
          [require('sequelize').Op.or]: [
            { patient_id: { [require('sequelize').Op.iLike]: `%${search}%` } },
            { city: { [require('sequelize').Op.iLike]: `%${search}%` } },
            { state: { [require('sequelize').Op.iLike]: `%${search}%` } },
          ],
        }
      : {};

    const { count, rows } = await EhrPatient.findAndCountAll({
      where: whereClause,
      order: [['patient_id', 'ASC']],
      limit,
      offset,
    });

    return res.json({
      success: true,
      data: {
        patients: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/admin/ehr/patient/:id
 * Update a single EHR patient record
 */
const updateEhrPatient = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.updated_at;

    const patient = await EhrPatient.findByPk(id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    await patient.update(updateData);

    return res.json({
      success: true,
      message: 'Patient updated successfully.',
      data: patient,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/ehr/patient
 * Add a new EHR patient record
 */
const addEhrPatient = async (req, res, next) => {
  try {
    const patientData = req.body;

    if (!patientData.patient_id) {
      return res.status(400).json({ success: false, message: 'patient_id is required.' });
    }

    // Check if patient_id already exists
    const existing = await EhrPatient.findOne({ where: { patient_id: patientData.patient_id } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'patient_id already exists.' });
    }

    const patient = await EhrPatient.create(patientData);

    return res.json({
      success: true,
      message: 'Patient added successfully.',
      data: patient,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/admin/ehr/patient/:id
 * Delete an EHR patient record
 */
const deleteEhrPatient = async (req, res, next) => {
  try {
    const { id } = req.params;

    const patient = await EhrPatient.findByPk(id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }

    await patient.destroy();

    return res.json({
      success: true,
      message: 'Patient deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/admin/ehr/bulk-update
 * Bulk update multiple patients
 */
const bulkUpdateEhrPatients = async (req, res, next) => {
  try {
    const { patients } = req.body;

    if (!Array.isArray(patients) || patients.length === 0) {
      return res.status(400).json({ success: false, message: 'No patients data provided.' });
    }

    let updated = 0;
    const errors = [];

    for (const patientData of patients) {
      try {
        if (patientData.id) {
          const patient = await EhrPatient.findByPk(patientData.id);
          if (patient) {
            await patient.update(patientData);
            updated++;
          }
        } else if (patientData.patient_id) {
          // Upsert based on patient_id
          await EhrPatient.upsert(patientData);
          updated++;
        }
      } catch (err) {
        errors.push({ patient_id: patientData.patient_id, error: err.message });
      }
    }

    return res.json({
      success: true,
      message: `Updated ${updated} records.`,
      data: { updated, errors },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/ehr/columns
 * Get column definitions for the EHR table
 */
const getEhrColumns = async (req, res, next) => {
  try {
    const columns = [
      { key: 'patient_id', label: 'Patient ID', type: 'string', required: true },
      { key: 'age', label: 'Age', type: 'number' },
      { key: 'gender', label: 'Gender', type: 'string' },
      { key: 'race', label: 'Race', type: 'string' },
      { key: 'ethnicity', label: 'Ethnicity', type: 'string' },
      { key: 'marital_status', label: 'Marital Status', type: 'string' },
      { key: 'city', label: 'City', type: 'string' },
      { key: 'state', label: 'State', type: 'string' },
      { key: 'zip', label: 'ZIP', type: 'string' },
      { key: 'total_encounters', label: 'Total Encounters', type: 'number' },
      { key: 'emergency_visits', label: 'Emergency Visits', type: 'number' },
      { key: 'inpatient_visits', label: 'Inpatient Visits', type: 'number' },
      { key: 'outpatient_visits', label: 'Outpatient Visits', type: 'number' },
      { key: 'wellness_visits', label: 'Wellness Visits', type: 'number' },
      { key: 'ambulatory_visits', label: 'Ambulatory Visits', type: 'number' },
      { key: 'total_conditions', label: 'Total Conditions', type: 'number' },
      { key: 'chronic_conditions', label: 'Chronic Conditions', type: 'number' },
      { key: 'unique_condition_codes', label: 'Unique Condition Codes', type: 'text' },
      { key: 'unique_condition_descriptions', label: 'Unique Condition Descriptions', type: 'text' },
      { key: 'total_medications', label: 'Total Medications', type: 'number' },
      { key: 'unique_medications', label: 'Unique Medications', type: 'number' },
      { key: 'unique_medication_descriptions', label: 'Unique Medication Descriptions', type: 'text' },
      { key: 'total_dispenses', label: 'Total Dispenses', type: 'number' },
      { key: 'total_procedures', label: 'Total Procedures', type: 'number' },
      { key: 'total_allergies', label: 'Total Allergies', type: 'number' },
      { key: 'total_observations', label: 'Total Observations', type: 'number' },
      { key: 'total_imaging_studies', label: 'Total Imaging Studies', type: 'number' },
      { key: 'total_immunizations', label: 'Total Immunizations', type: 'number' },
      { key: 'total_careplans', label: 'Total Care Plans', type: 'number' },
      { key: 'total_supplies', label: 'Total Supplies', type: 'number' },
      { key: 'total_devices', label: 'Total Devices', type: 'number' },
      { key: 'total_encounter_costs', label: 'Total Encounter Costs', type: 'number' },
      { key: 'total_base_encounter_costs', label: 'Total Base Encounter Costs', type: 'number' },
      { key: 'total_payer_coverage_encounters', label: 'Total Payer Coverage Encounters', type: 'number' },
      { key: 'total_medication_costs', label: 'Total Medication Costs', type: 'number' },
      { key: 'total_base_medication_costs', label: 'Total Base Medication Costs', type: 'number' },
      { key: 'total_payer_coverage_medications', label: 'Total Payer Coverage Medications', type: 'number' },
    ];

    return res.json({ success: true, data: columns });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadEhrExcel,
  getEhrPatients,
  updateEhrPatient,
  addEhrPatient,
  deleteEhrPatient,
  bulkUpdateEhrPatients,
  getEhrColumns,
};
