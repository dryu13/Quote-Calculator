// pages/api/send-quote.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    email, 
    quoteId,
    category,
    goodsDescription,
    transitMethod,
    coverageType,
    coverageFor,
    cargoValue,
    additionalValue,
    carrierInsurance,
    rate,
    premium,
    deductible,
    insuredAmount
  } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const ADMIN_EMAIL = 'o.dryu@me.com'; // Копия вам
  const FROM_EMAIL = 'quotes@cargoquote.pro'; // От кого отправляем

  // Форматирование валюты
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD', 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    }).format(amount);
  };

  // Форматирование rate
  const formatRate = (r) => {
    const percentage = r * 100;
    let formatted = percentage.toFixed(3);
    while (formatted.endsWith('0') && formatted.split('.')[1].length > 2) {
      formatted = formatted.slice(0, -1);
    }
    return formatted + '%';
  };

  // HTML шаблон письма
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">FreightInsuranceDirect</h1>
          <p style="color: #94a3b8; margin: 10px 0 0; font-size: 14px;">RAMON INC. • SINCE 1982</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #1e293b; margin: 0 0 20px; font-size: 22px;">Your Cargo Insurance Quote</h2>
          
          <p style="color: #64748b; margin: 0 0 30px; font-size: 15px; line-height: 1.6;">
            Thank you for using our cargo insurance calculator. Here are the details of your quote:
          </p>

          <!-- Quote Details Box -->
          <div style="background-color: #f8fafc; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Category:</td>
                <td style="padding: 10px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${category || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Goods Description:</td>
                <td style="padding: 10px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${goodsDescription || 'N/A'}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Transit Method:</td>
                <td style="padding: 10px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${transitMethod}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Coverage Type:</td>
                <td style="padding: 10px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${coverageType}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Coverage For:</td>
                <td style="padding: 10px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${coverageFor}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Cargo Value:</td>
                <td style="padding: 10px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${formatCurrency(cargoValue)}</td>
              </tr>
              ${coverageFor === 'Additional' ? `
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Additional Value:</td>
                <td style="padding: 10px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${formatCurrency(additionalValue)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; color: #64748b; font-size: 14px;">Carrier Insurance:</td>
                <td style="padding: 10px 0; color: #1e293b; font-size: 14px; font-weight: 600; text-align: right;">${formatCurrency(carrierInsurance)}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <!-- Results Box -->
          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%); border-radius: 12px; padding: 25px; margin-bottom: 30px; border: 1px solid #bbf7d0;">
            <h3 style="color: #059669; margin: 0 0 20px; font-size: 18px;">Quote Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 12px 0; color: #64748b; font-size: 16px;">Rate:</td>
                <td style="padding: 12px 0; color: #1e293b; font-size: 20px; font-weight: 700; text-align: right;">${formatRate(rate)}</td>
              </tr>
              <tr>
                <td style="padding: 12px 0; color: #059669; font-size: 16px; font-weight: 600;">Premium:</td>
                <td style="padding: 12px 0; color: #059669; font-size: 24px; font-weight: 700; text-align: right;">${formatCurrency(premium)}</td>
              </tr>
              ${coverageFor === 'Full Value' && deductible !== undefined ? `
              <tr>
                <td style="padding: 12px 0; color: #64748b; font-size: 16px;">Deductible:</td>
                <td style="padding: 12px 0; color: #1e293b; font-size: 20px; font-weight: 700; text-align: right;">${formatCurrency(deductible)}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="https://ramonins-usa.com/purchase-now/" style="display: inline-block; background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 10px; font-weight: 600; font-size: 16px;">
              Purchase Coverage →
            </a>
          </div>

          <!-- Disclaimer -->
          <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; margin: 0;">
            <strong>Disclaimer:</strong> All quotes are indicative and non-binding. Coverage, rates, limits, and terms are subject to verification of shipment information, underwriting approval, and policy issuance. We reserve the rights to modify or withdraw quotations. For support, call <strong>888-441-4435</strong>.
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #64748b; font-size: 13px; margin: 0 0 10px;">
            © 2024 Ramon Inc. All rights reserved.
          </p>
          <p style="margin: 0;">
            <a href="https://ramonins-usa.com" style="color: #1e3a5f; text-decoration: none; font-size: 13px;">Website</a>
            &nbsp;•&nbsp;
            <a href="https://ramonins-usa.com/contact-us/" style="color: #1e3a5f; text-decoration: none; font-size: 13px;">Contact Us</a>
          </p>
        </div>

      </div>
    </body>
    </html>
  `;

  // Текст для админа
  const adminEmailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
      <h2 style="color: #1e3a5f;">New Quote Request</h2>
      <p><strong>Customer Email:</strong> ${email}</p>
      <p><strong>Quote ID:</strong> ${quoteId || 'N/A'}</p>
      <hr style="border: 1px solid #e2e8f0; margin: 20px 0;">
      <h3>Quote Details:</h3>
      <ul>
        <li><strong>Category:</strong> ${category || 'N/A'}</li>
        <li><strong>Goods:</strong> ${goodsDescription || 'N/A'}</li>
        <li><strong>Transit Method:</strong> ${transitMethod}</li>
        <li><strong>Coverage Type:</strong> ${coverageType}</li>
        <li><strong>Coverage For:</strong> ${coverageFor}</li>
        <li><strong>Cargo Value:</strong> ${formatCurrency(cargoValue)}</li>
        ${coverageFor === 'Additional' ? `
        <li><strong>Additional Value:</strong> ${formatCurrency(additionalValue)}</li>
        <li><strong>Carrier Insurance:</strong> ${formatCurrency(carrierInsurance)}</li>
        ` : ''}
      </ul>
      <h3>Results:</h3>
      <ul>
        <li><strong>Rate:</strong> ${formatRate(rate)}</li>
        <li><strong>Premium:</strong> ${formatCurrency(premium)}</li>
        ${coverageFor === 'Full Value' ? `<li><strong>Deductible:</strong> ${formatCurrency(deductible)}</li>` : ''}
      </ul>
      <hr style="border: 1px solid #e2e8f0; margin: 20px 0;">
      <p style="color: #64748b; font-size: 12px;">Sent from Cargo Insurance Calculator</p>
    </body>
    </html>
  `;

  try {
    // Отправляем email клиенту
    const customerResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `FreightInsuranceDirect <${FROM_EMAIL}>`,
        to: [email],
        subject: `Your Cargo Insurance Quote - ${formatCurrency(premium)} Premium`,
        html: emailHtml,
      }),
    });

    if (!customerResponse.ok) {
      const error = await customerResponse.json();
      console.error('Resend error (customer):', error);
      return res.status(500).json({ error: 'Failed to send email to customer', details: error });
    }

    // Отправляем копию админу
    const adminResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Quote Calculator <${FROM_EMAIL}>`,
        to: [ADMIN_EMAIL],
        subject: `New Quote Request: ${email} - ${formatCurrency(premium)}`,
        html: adminEmailHtml,
      }),
    });

    if (!adminResponse.ok) {
      console.error('Resend error (admin):', await adminResponse.json());
      // Не возвращаем ошибку, т.к. клиенту уже отправили
    }

    // Обновляем запись в Supabase
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (SUPABASE_URL && SUPABASE_SERVICE_KEY && quoteId) {
      await fetch(`${SUPABASE_URL}/rest/v1/quote_requests?id=eq.${quoteId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          email: email,
          email_sent: true,
          email_sent_at: new Date().toISOString()
        })
      });
    }

    return res.status(200).json({ success: true, message: 'Quote sent successfully!' });

  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
}
