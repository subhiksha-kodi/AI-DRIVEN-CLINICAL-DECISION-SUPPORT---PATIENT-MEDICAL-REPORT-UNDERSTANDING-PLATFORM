/**
 * EhrPatient model - Stores parsed EHR patient data from Excel uploads
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EhrPatient = sequelize.define('EhrPatient', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  patient_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  gender: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  race: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  ethnicity: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  marital_status: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  income: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  zip: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  healthcare_expenses: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  healthcare_coverage: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  total_encounters: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  emergency_visits: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  inpatient_visits: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  outpatient_visits: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  wellness_visits: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  ambulatory_visits: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  total_conditions: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  chronic_conditions: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  unique_condition_codes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  unique_condition_descriptions: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  total_medications: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  unique_medications: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  unique_medication_descriptions: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  total_dispenses: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  total_procedures: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  total_allergies: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  total_observations: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  total_imaging_studies: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  total_immunizations: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  total_careplans: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  total_supplies: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  total_devices: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  total_encounter_costs: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  total_base_encounter_costs: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  total_payer_coverage_encounters: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  total_medication_costs: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  total_base_medication_costs: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  total_payer_coverage_medications: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
}, {
  tableName: 'ehr_patients',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['patient_id'],
    },
  ],
});

module.exports = EhrPatient;
