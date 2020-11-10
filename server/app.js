const express = require('express')
const helmet = require('helmet')
const morgan = require('morgan')
const cors = require('cors')
const monk = require('monk')
const yup = require('yup')
const { nanoid } = require('nanoid')

const url = 'mongodb+srv://root:plokijuhyg@brskins.lt8cf.mongodb.net/brskins?retryWrites=true&w=majority'
const db = monk(url)
db.then(()=>{
  console.log("Connected to DB");
})
const urls = db.get('urls')
urls.createIndex({slug: 1}, {unique: true})


const app = express()
//app.use(helmet())
app.use(morgan('tiny'))
app.use(cors())
app.use(express.json())
app.use(express.static(__dirname + '/public'))


const schema = yup.object().shape({
  slug: yup.string().trim().matches(/[\w\-]/i).nullable(),
  url: yup.string().trim().url().required(),
})
app.post('/url', async (req, res, next)=>{
  let {slug, url} = req.body;
  try {
    await schema.validate({
      slug,
      url
    })
    if(!slug){
      slug = nanoid(5);
      console.log(slug)
    }else{
      const existing = await urls.findOne({slug});
      if(existing){
        throw new Error('Slug in use!')
      }
    }
    slug = slug.toLowerCase()
    const newUrl = {
      slug,
      url,
    }
    const created = await urls.insert(newUrl)
    res.json(created)
  } catch (error) {
    next(error)
  }
})

app.get('/:id', async (req, res, next)=>{
  const { id: slug } = req.params;
  try {
    const url = await urls.findOne({ slug })
    if(url){
      res.redirect(url.url);
    }
    res.redirect('/?error=${slug} not found')
  } catch (error) {
    res.redirect('/?error=Link not found')
    next(error)
  }
})

app.use((error, req, res, then)=>{
  if(error.status){
    res.status(error.status)
  }else{
    res.status(500)
  }
  res.json({
    message: error.message,
    stack: process.env.NODE_ENV === 'production' ? '🥧' : error.stack,
  })
})

const port = process.env.PORT || 1337
app.listen(port, ()=>{
  console.log(`Listening at ${port}`);
})