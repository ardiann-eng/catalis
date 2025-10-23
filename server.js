const express = require('express');
const cors = require('cors');
const midtransClient = require('midtrans-client');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: 'Mid-server-XVdnQPgGcucvnoRJYNWzNw1j',
  clientKey: 'Mid-client-QZNRNJ4ROIoY8PAn'
});

app.post('/create-transaction', async (req, res) => {
  try {
    const parameter = req.body;
    const transaction = await snap.createTransaction(parameter);
    const transactionToken = transaction.token;
    res.status(200).json({ token: transactionToken });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});