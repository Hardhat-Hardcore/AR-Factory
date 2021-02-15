const express = require('express')
const path = require('path')
const app = express()

app.use(express.static(path.join(__dirname, '/public'), { index: 'index.html' }))
app.use(express.static(__dirname, { dotfiles: 'allow' }))

app.get('/', (req, res) => {
  res.send('ok')
})

app.listen((3000), () => console.log('Server listen on http://localhost:3000/'))
