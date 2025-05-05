import express from 'express';

const app = express();
const PORT = 5000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Hello from TypeScript Express!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
