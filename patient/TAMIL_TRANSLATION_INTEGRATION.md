# Tamil Translation Integration Guide

## Overview
This document explains how Tamil language translation is integrated into the patient portal for AI explanations.

## Translation Model Used

### **Recommended: OpenRouter/Claude 3.5 Sonnet** ✅
- **Why**: Already integrated in your system, no additional API keys needed
- **Accuracy**: Excellent for medical explanations with context awareness
- **Cost**: Uses your existing OpenRouter API key
- **Best for**: Medical terminology, context-aware translations

### Alternative Options:

1. **Google Translate API** (More accurate for Tamil)
   - Requires: `GOOGLE_TRANSLATE_API_KEY` environment variable
   - More accurate for simple translations
   - Paid service (first 500k chars/month free)

2. **Groq Models** (Free & Fast)
   - Already integrated
   - Fast but less accurate than Claude for Tamil
   - Good fallback option

## How It Works

### Backend Flow:
1. Patient requests analysis with language preference (`?language=ta`)
2. AI analyzes the medical document (Groq + OpenRouter)
3. Translation service translates patient-facing explanations to Tamil
4. Results stored with both English and Tamil versions

### Frontend Flow:
1. Patient selects language (English/Tamil) from dropdown
2. Language preference saved in localStorage
3. When analyzing, language parameter sent to backend
4. Results displayed in selected language

## Files Modified

### Backend:
- `backend/src/services/translation.service.js` - **NEW** Translation service
- `backend/src/controllers/patient.enhanced.analysis.controller.js` - Added translation support
- `backend/src/controllers/patient.analysis.controller.js` - Added translation support

### Frontend:
- `frontend/src/pages/patient/PatientReportsPage.jsx` - Added language selector

## Usage

### For Patients:
1. Go to Patient Portal → Reports
2. Select language from dropdown (English/தமிழ்)
3. Upload and analyze reports
4. Explanations will be in selected language

### API Usage:
```javascript
// Request analysis in Tamil
POST /api/patient/reports/:id/enhanced-analyze?language=ta

// Request analysis in English (default)
POST /api/patient/reports/:id/enhanced-analyze?language=en
```

## What Gets Translated

The following patient-facing fields are translated:
- Patient summary
- Clinical interpretations
- Medication explanations (purpose, how it works, side effects)
- Test analysis explanations
- Lifestyle recommendations
- Medical recommendations
- Condition explanations

**Technical data (test values, medication names, etc.) remain unchanged.**

## Environment Variables

### Required (Already Set):
```env
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
```

### Optional (For Google Translate):
```env
GOOGLE_TRANSLATE_API_KEY=your_google_api_key
```

## Switching Translation Service

To use Google Translate instead of OpenRouter:

1. Get Google Translate API key from Google Cloud Console
2. Add to `.env`:
   ```env
   GOOGLE_TRANSLATE_API_KEY=your_key
   ```
3. In `translation.service.js`, change `translateAnalysisResults` call:
   ```javascript
   finalResult = await translateAnalysisResults(finalResult, 'ta', true); // true = use Google
   ```

## Supported Languages

Currently supported:
- `en` - English (default)
- `ta` - Tamil (தமிழ்)

To add more languages, update `languageNames` in `translation.service.js`:
```javascript
const languageNames = {
  'ta': 'Tamil',
  'en': 'English',
  'hi': 'Hindi',      // Add Hindi
  'te': 'Telugu',     // Add Telugu
  // ... more languages
};
```

## Testing

1. **Test Tamil Translation:**
   ```bash
   # Start your Docker containers
   docker-compose up
   
   # Login as patient
   # Select Tamil from language dropdown
   # Upload and analyze a report
   # Verify explanations are in Tamil
   ```

2. **Test API Directly:**
   ```bash
   curl -X POST "http://localhost:5000/api/patient/reports/1/enhanced-analyze?language=ta" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

## Troubleshooting

### Translation Not Working:
1. Check OpenRouter API key is set
2. Check backend logs for translation errors
3. Verify language parameter is being sent (`?language=ta`)

### Poor Translation Quality:
1. Try Google Translate API (more accurate)
2. Check if medical terms are being translated correctly
3. Consider adding medical term dictionary

### Performance Issues:
- Translation adds ~2-5 seconds per analysis
- Consider caching translations
- Use async translation (translate after initial response)

## Future Enhancements

1. **Caching**: Cache translations to avoid re-translating same content
2. **Medical Dictionary**: Custom medical term translations
3. **More Languages**: Add Hindi, Telugu, Kannada, Malayalam
4. **Real-time Translation**: Translate on-demand without re-analysis
5. **Translation Quality**: Add user feedback for translation quality

## Cost Considerations

- **OpenRouter/Claude**: Uses existing API quota
- **Google Translate**: First 500k chars/month free, then $20 per million chars
- **Groq**: Free tier available

## Support

For issues or questions:
1. Check backend logs: `docker-compose logs backend`
2. Verify API keys are set correctly
3. Test with English first, then Tamil
