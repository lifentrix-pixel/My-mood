export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { endpoint } = req.query;
  const token = req.headers.authorization;
  
  if (!endpoint || !token) {
    return res.status(400).json({ error: 'Missing endpoint or authorization' });
  }
  
  try {
    const response = await fetch(`https://api.ouraring.com/v2/${endpoint}`, {
      headers: { 'Authorization': token }
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
