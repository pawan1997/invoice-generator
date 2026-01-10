const invoicePrompt = `You are an invoice data parser. Extract invoice details from the user input and return ONLY valid JSON (no markdown, no code blocks, just raw JSON) with these fields:
{
    "expertName": "Name of the expert/seller",
    "expertLink": "URL to expert profile (full URL)",
    "billedName": "Customer name",
    "billedEmail": "Customer email",
    "billedPhone": "Customer phone number",
    "itemName": "Service/product name",
    "amount": 0,
    "discount": 0,
    "date": "YYYY-MM-DD format"
}

If any field is missing, use reasonable defaults. For date, convert any format to YYYY-MM-DD.`;

const certificatePrompt = `You are a certificate data parser. Extract certificate details from the user input and return ONLY valid JSON (no markdown, no code blocks, just raw JSON) with these fields:
{
    "recipientName": "Full name of person receiving the certificate",
    "courseName": "Name of the course or program completed",
    "cohortName": "Name of the cohort if mentioned (e.g., 'February 2026 Cohort'), or empty string",
    "certificateType": "cohort" or "self-paced" (use "cohort" if cohort name is mentioned, otherwise "self-paced"),
    "creatorName": "Name of the instructor or course creator",
    "creatorProfileUrl": "Full Topmate URL (e.g., https://topmate.io/username)",
    "completionDate": "Date when recipient completed the course in YYYY-MM-DD format",
    "issueDate": "Date when certificate is issued in YYYY-MM-DD format (use today if not specified)",
    "duration": "Course duration (e.g., '8 weeks', '12 hours'), or empty string if not mentioned",
    "signatureTitle": "Title for signature (e.g., 'Course Instructor', 'Founder'), default to 'Course Instructor'"
}

If any field is missing, use reasonable defaults. For dates, convert any format to YYYY-MM-DD. If a Topmate username is mentioned without full URL, prepend https://topmate.io/`;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { input, type = 'invoice' } = req.body;

    if (!input) {
        return res.status(400).json({ error: 'Input is required' });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
    }

    // Select the appropriate prompt based on type
    const systemPrompt = type === 'certificate' ? certificatePrompt : invoicePrompt;

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://invoice-generator-cyan-eight.vercel.app',
                'X-Title': 'Invoice Generator'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: input
                    }
                ],
                temperature: 0.1
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ error: data.error.message || 'API error' });
        }

        const content = data.choices[0].message.content;
        const parsedData = JSON.parse(content);

        return res.status(200).json(parsedData);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
