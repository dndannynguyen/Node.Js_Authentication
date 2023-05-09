const mongoose = require('mongoose');
const app = require('./app')
main().catch(err => console.log(err));
require('dotenv').config();

async function main() {
  await mongoose.connect(`mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST}/${process.env.MONGODB_DATABASE}`);
  app.listen(process.env.PORT || 3000, () => {
    console.log('Listening to server!');
});

  // use `await mongoose.connect('mongodb://user:password@127.0.0.1:27017/test');` if your database has auth enabled
}