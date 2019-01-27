const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const app = express()
const fs = require('fs')
const path = require('path')
const tokens = require('../tokens.json')
const FetchScript = require('fetch-script')
const crypto = require('crypto')
const sessions = {}

app.use(cors())
app.use(bodyParser.json())

app.post('/script/:scriptName', checkScriptAccess, (req, res) => {
  const token = req.get('private-token')
  const tokenData = getTokenData(token)
  let code = null
  try {
    code = getScriptCode(req.params.scriptName)
  } catch (err) {
    console.error(err)
    return res.send({ error: 'Could not load script', message: err.message })
  }
  const outs = []
  const errors = []
  const fetchScript = new FetchScript(tokenData.options || null)
  fetchScript.on('out', out => outs.push(out))
  fetchScript.on('error', e => errors.push(e))
  fetchScript.executeCode(code).then(outs => {
    res.send({
      errors,
      out: outs
    })
  })
})

app.post('/start-session', checkExecuteAccess, (req, res) => {
  const token = req.get('private-token')
  const sessionId = crypto.randomBytes(4).toString('hex')
  const tokenData = getTokenData(token)
  sessions[sessionId] = new FetchScript(tokenData.options || null)
  res.send({ sessionId })
})

app.post('/execute', checkExecuteAccess, (req, res) => {
  if (!req.body.sessionId) {
    return res.status(400).send({
      error: 'sessionId required'
    })
  }
  const fetchScript = sessions[req.body.sessionId]
  if (!fetchScript) {
    return res.status(400).send({
      error: 'invalid sessionId'
    })
  }
  const errors = []
  fetchScript.on('error', e => errors.push(e))
  fetchScript.executeCode(req.body.code).then(outs => {
    const result = {
      errors,
      out: outs
    }
    if (req.body.dumpVars) {
      result.vars = fetchScript.getVars()
    }
    res.send(result)
  }).catch(err => {
    res.send({errors: [err.message], out: []})
  })
})

function checkExecuteAccess (req, res, next) {
  const token = req.get('private-token')
  if (!token) {
    return res.send({ error: 'Missing Private-Token header' })
  }
  const tokenData = getTokenData(token)
  if (tokenData && tokenData.execute) {
    next()
  } else {
    return res.status(401).send({
      error: 'This token does not have permission to execute code on this server'
    })
  }
}

function checkScriptAccess (req, res, next) {
  const token = req.get('private-token')
  if (!token) {
    return res.send({ error: 'Missing Private-Token header' })
  }
  const tokenData = getTokenData(token)
  if (tokenData && tokenData.scripts) {
    if (tokenData.scripts.includes(req.params.scriptName) || tokenData.scripts.includes('*')) {
      next()
    } else {
      return res.status(401).send({
        error: 'This token does not have permission to execute this script'
      })
    }
  } else {
    return res.status(401).send({
      error: 'This token does not have permission to execute scripts on this server'
    })
  }
}

function getTokenData (token) {
  return tokens[token]
}

function getScriptCode (scriptFile) {
  return fs.readFileSync(path.resolve(__dirname, '../scripts/' + scriptFile), { encoding: 'utf-8' })
}

module.exports = app
