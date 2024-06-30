const express = require('express');
const admin = require('firebase-admin');
const session = require('express-session');
const bcrypt = require('bcrypt');
const bodyparser = require('body-parser');
const path = require('path');
const https = require('https'); 

const app = express();
const PORT = 3000;

const serviceAccount = require('./login-signup-form-d12b0-firebase-adminsdk-skz7x-bc227c3001.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

app.set('view engine', 'ejs');
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));

app.use(session({
  secret: 'thisisASecret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: !true },
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/booksapp', express.static(path.join(__dirname, 'booksapp')));

app.get('/page', (req, res) => {
  res.render('page');
});

app.get('/contact', (req, res) => {
  res.render('contact'); 
});

app.get('/certify', (req, res) => {
  res.render('certify');
});


app.get('/', (req, res) => {
  
  if (!req.session.userId) {
    return res.redirect('/login');
  }

 
  const options = {
    method: 'GET',
    hostname: 'goodreads12.p.rapidapi.com',
    path: '/searchBooks?keyword=harry%20potter&page=1',
    headers: {
      'x-rapidapi-key': 'c7f6b75d7amsh44492b915222141p14ff6ejsn3046272d3386',
      'x-rapidapi-host': 'goodreads12.p.rapidapi.com'
    }
  };

  https.request(options, function (apiRes) {
    let data = '';
  
    apiRes.on('data', function (chunk) {
      data += chunk;
    });
  
    apiRes.on('end', function () {
      try {
        const parsedData = JSON.parse(data);
        res.render('page', { books: parsedData.books }); 
      } catch (error) {
        console.error('Error parsing JSON:', error);
        res.status(500).send('Error fetching data');
      }
    });
  }).end();
});

app.get('/login', (req, res) => {
  const loggedOutMsg = req.query.loggedOutMsg || '';
  res.render('login', { loggedOutMsg });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const userDoc = await db.collection('users').doc(email).get();
  if (!userDoc.exists) {
    return res.status(400).send('User does not exist');
  }
  const user = userDoc.data();
  const isMatch = await bcrypt.compare(password, user.password);
  if (isMatch) {
    req.session.userId = userDoc.id;
    req.session.username = user.username;
    res.redirect('/dashboard');
  } else {
    res.status(400).send('Incorrect Password');
  }
});

app.get('/signup', (req, res) => {
  res.render('signup');
});

app.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  await db.collection('users').doc(email).set({
    username,
    email,
    password: hashedPassword
  });
  res.redirect('/login');
});

app.get('/dashboard', (req, res) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  res.render('landing-page', { username: req.session.username });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
