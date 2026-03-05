require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Cinema API running on port ${PORT} [${process.env.NODE_ENV}]`);
});
