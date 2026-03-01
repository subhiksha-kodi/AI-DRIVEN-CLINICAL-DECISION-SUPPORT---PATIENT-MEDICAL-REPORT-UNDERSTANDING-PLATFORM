/**
 * translation.service.js - Translation service for patient explanations
 * Supports Tamil and other languages
 */

// OpenRouter API configuration (already in use)
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';

// Google Translate API configuration (optional, more accurate)
const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const GOOGLE_TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2';

/**
 * Translate text using OpenRouter/Claude (Recommended - already integrated)
 * Best for: Medical explanations, context-aware translation
 */
const translateWithOpenRouter = async (text, targetLanguage = 'ta') => {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter API key not configured');
  }

  const languageNames = {
    'ta': 'Tamil',
    'en': 'English',
    'hi': 'Hindi',
    'te': 'Telugu',
    'kn': 'Kannada',
    'ml': 'Malayalam'
  };

  const targetLangName = languageNames[targetLanguage] || 'Tamil';

  const requestBody = {
    model: OPENROUTER_MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a professional medical translator. Translate medical explanations accurately while maintaining medical terminology and context. Return ONLY the translated text, no explanations or additional text.`
      },
      {
        role: 'user',
        content: `Translate the following medical explanation to ${targetLangName}. Keep medical terms accurate and maintain the same tone and structure:\n\n${text}`
      }
    ],
    temperature: 0.2,
    max_tokens: 2000,
  };

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5000',
        'X-Title': 'Clinical Intelligence Platform',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenRouter translation error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const translatedText = data.choices?.[0]?.message?.content?.trim();

    if (!translatedText) {
      throw new Error('No translation received from OpenRouter');
    }

    return translatedText;
  } catch (error) {
    console.error('OpenRouter translation error:', error);
    throw error;
  }
};

/**
 * Translate text using Google Translate API (Alternative - more accurate)
 * Best for: Simple, accurate translations
 */
const translateWithGoogle = async (text, targetLanguage = 'ta') => {
  if (!GOOGLE_TRANSLATE_API_KEY) {
    throw new Error('Google Translate API key not configured');
  }

  try {
    const response = await fetch(
      `${GOOGLE_TRANSLATE_API_URL}?key=${GOOGLE_TRANSLATE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          target: targetLanguage,
          source: 'en',
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Google Translate error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.data.translations[0].translatedText;
  } catch (error) {
    console.error('Google Translate error:', error);
    throw error;
  }
};

/**
 * Translate patient analysis results to Tamil
 * Translates all patient-facing explanations while keeping technical data intact
 */
const translateAnalysisResults = async (analysisResult, targetLanguage = 'ta', useGoogle = false) => {
  try {
    const translate = useGoogle ? translateWithGoogle : translateWithOpenRouter;
    
    // Fields to translate (patient-facing explanations)
    const fieldsToTranslate = [
      'patient_summary',
      'overall_clinical_interpretation',
      'overall_clinical_summary',
    ];

    // Nested fields to translate
    const nestedFields = {
      clinical_analysis: {
        diagnosis_analysis: ['condition_explanation', 'primary_condition'],
        medication_analysis: ['purpose', 'how_it_works', 'why_prescribed_for_this_case'],
        test_analysis: ['clinical_significance'],
        overall_clinical_summary: null, // entire object
      },
      extraction: {
        other_findings: null, // array of strings
      },
    };

    const translated = JSON.parse(JSON.stringify(analysisResult)); // Deep clone

    // Translate top-level fields
    for (const field of fieldsToTranslate) {
      if (translated[field] && typeof translated[field] === 'string') {
        try {
          translated[field] = await translate(translated[field], targetLanguage);
        } catch (err) {
          console.error(`Failed to translate ${field}:`, err);
          // Keep original text if translation fails
        }
      }
    }

    // Translate clinical_analysis fields
    if (translated.clinical_analysis) {
      const ca = translated.clinical_analysis;

      // Translate diagnosis analysis
      if (ca.diagnosis_analysis) {
        if (ca.diagnosis_analysis.condition_explanation) {
          try {
            ca.diagnosis_analysis.condition_explanation = await translate(
              ca.diagnosis_analysis.condition_explanation,
              targetLanguage
            );
          } catch (err) {
            console.error('Failed to translate condition_explanation:', err);
          }
        }
        if (ca.diagnosis_analysis.primary_condition) {
          try {
            ca.diagnosis_analysis.primary_condition = await translate(
              ca.diagnosis_analysis.primary_condition,
              targetLanguage
            );
          } catch (err) {
            console.error('Failed to translate primary_condition:', err);
          }
        }
      }

      // Translate medication analysis
      if (ca.medication_analysis && Array.isArray(ca.medication_analysis)) {
        for (const med of ca.medication_analysis) {
          // Translate text fields
          const textFields = [
            'medicine_name', 'drug_class', 'purpose', 'how_it_works', 
            'why_prescribed_for_this_case', 'condition_treated', 
            'dosage_instructions', 'duration', 'benefits_if_taken_properly',
            'what_happens_if_not_taken', 'what_happens_if_stopped_early',
            'what_happens_if_overdosed', 'patient_friendly_explanation'
          ];
          
          for (const field of textFields) {
            if (med[field] && typeof med[field] === 'string') {
              try {
                med[field] = await translate(med[field], targetLanguage);
              } catch (err) {
                console.error(`Failed to translate medication ${field}:`, err);
              }
            }
          }
          
          // Translate array fields
          const arrayFields = [
            'common_side_effects', 'serious_side_effects', 'important_warnings',
            'drug_interactions', 'interaction_risks'
          ];
          
          for (const field of arrayFields) {
            if (med[field] && Array.isArray(med[field])) {
              med[field] = await Promise.all(
                med[field].map(async (item) => {
                  try {
                    return await translate(item, targetLanguage);
                  } catch (err) {
                    console.error(`Failed to translate ${field} item:`, err);
                    return item;
                  }
                })
              );
            }
          }
        }
      }

      // Translate test analysis
      if (ca.test_analysis && Array.isArray(ca.test_analysis)) {
        for (const test of ca.test_analysis) {
          if (test.clinical_significance) {
            try {
              test.clinical_significance = await translate(
                test.clinical_significance,
                targetLanguage
              );
            } catch (err) {
              console.error('Failed to translate clinical_significance:', err);
            }
          }
          // Translate arrays
          if (test.possible_causes && Array.isArray(test.possible_causes)) {
            test.possible_causes = await Promise.all(
              test.possible_causes.map(async (cause) => {
                try {
                  return await translate(cause, targetLanguage);
                } catch (err) {
                  return cause;
                }
              })
            );
          }
        }
      }

      // Translate overall clinical summary
      if (ca.overall_clinical_summary) {
        try {
          ca.overall_clinical_summary = await translate(
            ca.overall_clinical_summary,
            targetLanguage
          );
        } catch (err) {
          console.error('Failed to translate overall_clinical_summary:', err);
        }
      }

      // Translate lifestyle recommendations
      if (ca.lifestyle_recommendations && Array.isArray(ca.lifestyle_recommendations)) {
        ca.lifestyle_recommendations = await Promise.all(
          ca.lifestyle_recommendations.map(async (rec) => {
            try {
              return await translate(rec, targetLanguage);
            } catch (err) {
              return rec;
            }
          })
        );
      }

      // Translate medical recommendations
      if (ca.medical_recommendations && Array.isArray(ca.medical_recommendations)) {
        ca.medical_recommendations = await Promise.all(
          ca.medical_recommendations.map(async (rec) => {
            try {
              return await translate(rec, targetLanguage);
            } catch (err) {
              return rec;
            }
          })
        );
      }
    }

    // Translate extraction other_findings
    if (translated.extraction?.other_findings && Array.isArray(translated.extraction.other_findings)) {
      translated.extraction.other_findings = await Promise.all(
        translated.extraction.other_findings.map(async (finding) => {
          try {
            return await translate(finding, targetLanguage);
          } catch (err) {
            return finding;
          }
        })
      );
    }

    // Translate extracted prescription details
    if (translated.prescription_details) {
      const pd = translated.prescription_details;
      if (pd.diagnosis) {
        try {
          pd.diagnosis = await translate(pd.diagnosis, targetLanguage);
        } catch (err) {
          console.error('Failed to translate diagnosis:', err);
        }
      }
      if (pd.chief_complaint) {
        try {
          pd.chief_complaint = await translate(pd.chief_complaint, targetLanguage);
        } catch (err) {
          console.error('Failed to translate chief_complaint:', err);
        }
      }
      if (pd.notes) {
        try {
          pd.notes = await translate(pd.notes, targetLanguage);
        } catch (err) {
          console.error('Failed to translate notes:', err);
        }
      }
    }

    // Translate medications array (extracted data)
    if (translated.medications && Array.isArray(translated.medications)) {
      for (const med of translated.medications) {
        if (med.medicine_name) {
          try {
            med.medicine_name = await translate(med.medicine_name, targetLanguage);
          } catch (err) {
            console.error('Failed to translate medicine_name:', err);
          }
        }
        if (med.instructions) {
          try {
            med.instructions = await translate(med.instructions, targetLanguage);
          } catch (err) {
            console.error('Failed to translate medication instructions:', err);
          }
        }
        if (med.dosage) {
          try {
            med.dosage = await translate(med.dosage, targetLanguage);
          } catch (err) {
            console.error('Failed to translate dosage:', err);
          }
        }
        if (med.frequency) {
          try {
            med.frequency = await translate(med.frequency, targetLanguage);
          } catch (err) {
            console.error('Failed to translate frequency:', err);
          }
        }
        if (med.duration) {
          try {
            med.duration = await translate(med.duration, targetLanguage);
          } catch (err) {
            console.error('Failed to translate duration:', err);
          }
        }
        if (med.route) {
          try {
            med.route = await translate(med.route, targetLanguage);
          } catch (err) {
            console.error('Failed to translate route:', err);
          }
        }
      }
    }

    // Translate test results (extracted data)
    if (translated.test_results && Array.isArray(translated.test_results)) {
      for (const test of translated.test_results) {
        if (test.test_name) {
          try {
            test.test_name = await translate(test.test_name, targetLanguage);
          } catch (err) {
            console.error('Failed to translate test_name:', err);
          }
        }
        if (test.test_category) {
          try {
            test.test_category = await translate(test.test_category, targetLanguage);
          } catch (err) {
            console.error('Failed to translate test_category:', err);
          }
        }
        if (test.interpretation) {
          try {
            test.interpretation = await translate(test.interpretation, targetLanguage);
          } catch (err) {
            console.error('Failed to translate test interpretation:', err);
          }
        }
      }
    }

    // Translate lab_tests (from extraction object)
    if (translated.extraction?.lab_tests && Array.isArray(translated.extraction.lab_tests)) {
      for (const test of translated.extraction.lab_tests) {
        if (test.test_name) {
          try {
            test.test_name = await translate(test.test_name, targetLanguage);
          } catch (err) {
            console.error('Failed to translate lab test_name:', err);
          }
        }
      }
    }

    // Translate medications from extraction object (regular analysis format)
    if (translated.extraction?.medications && Array.isArray(translated.extraction.medications)) {
      for (const med of translated.extraction.medications) {
        if (med.name) {
          try {
            med.name = await translate(med.name, targetLanguage);
          } catch (err) {
            console.error('Failed to translate extraction medication name:', err);
          }
        }
        if (med.dosage) {
          try {
            med.dosage = await translate(med.dosage, targetLanguage);
          } catch (err) {
            console.error('Failed to translate extraction dosage:', err);
          }
        }
        if (med.frequency) {
          try {
            med.frequency = await translate(med.frequency, targetLanguage);
          } catch (err) {
            console.error('Failed to translate extraction frequency:', err);
          }
        }
        if (med.duration) {
          try {
            med.duration = await translate(med.duration, targetLanguage);
          } catch (err) {
            console.error('Failed to translate extraction duration:', err);
          }
        }
      }
    }

    // Translate interactions descriptions
    if (translated.interactions?.interactions && Array.isArray(translated.interactions.interactions)) {
      for (const interaction of translated.interactions.interactions) {
        if (interaction.description) {
          try {
            interaction.description = await translate(interaction.description, targetLanguage);
          } catch (err) {
            console.error('Failed to translate interaction description:', err);
          }
        }
        if (interaction.guideline_reference) {
          try {
            interaction.guideline_reference = await translate(interaction.guideline_reference, targetLanguage);
          } catch (err) {
            console.error('Failed to translate guideline reference:', err);
          }
        }
        // Translate drug names in interactions
        if (interaction.drugs && Array.isArray(interaction.drugs)) {
          interaction.drugs = await Promise.all(
            interaction.drugs.map(async (drug) => {
              try {
                return await translate(drug, targetLanguage);
              } catch (err) {
                return drug;
              }
            })
          );
        }
      }
    }

    // Translate risk assessment fields
    if (translated.risk_assessment) {
      const ra = translated.risk_assessment;
      if (ra.risk_factors && Array.isArray(ra.risk_factors)) {
        ra.risk_factors = await Promise.all(
          ra.risk_factors.map(async (factor) => {
            try {
              return await translate(factor, targetLanguage);
            } catch (err) {
              return factor;
            }
          })
        );
      }
      if (ra.notes) {
        try {
          ra.notes = await translate(ra.notes, targetLanguage);
        } catch (err) {
          console.error('Failed to translate risk assessment notes:', err);
        }
      }
    }

    // Translate disclaimers
    if (translated.disclaimers && Array.isArray(translated.disclaimers)) {
      translated.disclaimers = await Promise.all(
        translated.disclaimers.map(async (disclaimer) => {
          try {
            return await translate(disclaimer, targetLanguage);
          } catch (err) {
            return disclaimer;
          }
        })
      );
    }

    // Translate investigations
    if (translated.investigations && Array.isArray(translated.investigations)) {
      translated.investigations = await Promise.all(
        translated.investigations.map(async (inv) => {
          try {
            return typeof inv === 'string' ? await translate(inv, targetLanguage) : inv;
          } catch (err) {
            return inv;
          }
        })
      );
    }

    // Translate follow_up
    if (translated.follow_up) {
      try {
        translated.follow_up = await translate(translated.follow_up, targetLanguage);
      } catch (err) {
        console.error('Failed to translate follow_up:', err);
      }
    }

    // Translate lifestyle_advice
    if (translated.lifestyle_advice) {
      try {
        translated.lifestyle_advice = await translate(translated.lifestyle_advice, targetLanguage);
      } catch (err) {
        console.error('Failed to translate lifestyle_advice:', err);
      }
    }

    // Translate additional_notes
    if (translated.additional_notes) {
      try {
        translated.additional_notes = await translate(translated.additional_notes, targetLanguage);
      } catch (err) {
        console.error('Failed to translate additional_notes:', err);
      }
    }

    // Translate overall_summary
    if (translated.overall_summary) {
      try {
        translated.overall_summary = await translate(translated.overall_summary, targetLanguage);
      } catch (err) {
        console.error('Failed to translate overall_summary:', err);
      }
    }

    // Translate recommendations
    if (translated.recommendations) {
      try {
        translated.recommendations = await translate(translated.recommendations, targetLanguage);
      } catch (err) {
        console.error('Failed to translate recommendations:', err);
      }
    }

    // Translate critical_flags
    if (translated.critical_flags && Array.isArray(translated.critical_flags)) {
      translated.critical_flags = await Promise.all(
        translated.critical_flags.map(async (flag) => {
          try {
            return await translate(flag, targetLanguage);
          } catch (err) {
            return flag;
          }
        })
      );
    }

    // Translate condition_suspicions (from clinical analysis)
    if (translated.clinical_analysis?.condition_suspicions && Array.isArray(translated.clinical_analysis.condition_suspicions)) {
      for (const condition of translated.clinical_analysis.condition_suspicions) {
        if (condition.possible_condition) {
          try {
            condition.possible_condition = await translate(condition.possible_condition, targetLanguage);
          } catch (err) {
            console.error('Failed to translate possible_condition:', err);
          }
        }
        if (condition.reasoning) {
          try {
            condition.reasoning = await translate(condition.reasoning, targetLanguage);
          } catch (err) {
            console.error('Failed to translate condition reasoning:', err);
          }
        }
      }
    }

    // Translate medication names in clinical analysis
    if (translated.clinical_analysis?.medication_analysis && Array.isArray(translated.clinical_analysis.medication_analysis)) {
      for (const med of translated.clinical_analysis.medication_analysis) {
        if (med.medicine_name) {
          try {
            med.medicine_name = await translate(med.medicine_name, targetLanguage);
          } catch (err) {
            console.error('Failed to translate clinical medicine_name:', err);
          }
        }
        if (med.important_warnings && Array.isArray(med.important_warnings)) {
          med.important_warnings = await Promise.all(
            med.important_warnings.map(async (warning) => {
              try {
                return await translate(warning, targetLanguage);
              } catch (err) {
                return warning;
              }
            })
          );
        }
      }
    }

    // Translate test names in clinical analysis
    if (translated.clinical_analysis?.test_analysis && Array.isArray(translated.clinical_analysis.test_analysis)) {
      for (const test of translated.clinical_analysis.test_analysis) {
        if (test.test_name) {
          try {
            test.test_name = await translate(test.test_name, targetLanguage);
          } catch (err) {
            console.error('Failed to translate clinical test_name:', err);
          }
        }
        if (test.possible_symptoms_if_untreated && Array.isArray(test.possible_symptoms_if_untreated)) {
          test.possible_symptoms_if_untreated = await Promise.all(
            test.possible_symptoms_if_untreated.map(async (symptom) => {
              try {
                return await translate(symptom, targetLanguage);
              } catch (err) {
                return symptom;
              }
            })
          );
        }
        if (test.recommended_next_steps && Array.isArray(test.recommended_next_steps)) {
          test.recommended_next_steps = await Promise.all(
            test.recommended_next_steps.map(async (step) => {
              try {
                return await translate(step, targetLanguage);
              } catch (err) {
                return step;
              }
            })
          );
        }
      }
    }

    return translated;
  } catch (error) {
    console.error('Translation error:', error);
    // Return original if translation fails
    return analysisResult;
  }
};

module.exports = {
  translateAnalysisResults,
  translateWithOpenRouter,
  translateWithGoogle,
};
