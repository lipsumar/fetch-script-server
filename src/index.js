const express = require('express')
const app = express()
const fs = require('fs')
const path = require('path')
const tokens = require('../tokens.json')
const FetchScript = require('fetch-script')

app.get('/script/:scriptName', checkScriptAccess, (req, res, next) => {
  let code = null
  try {
    code = getScriptCode(req.params.scriptName)
  } catch (err) {
    console.error(err)
    return res.send({error: 'Could not load script'})
  }
  const outs = []
  const errors = []
  const fetchScript = new FetchScript()
  fetchScript.on('out', out => outs.push(out))
  fetchScript.on('error', e => errors.push(e))
  fetchScript.executeCode(code).then((outs) => {
    res.send({
      errors,
      out: outs
    })
  })
})

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
  return fs.readFileSync(
    path.resolve(__dirname, '../scripts/' + scriptFile),
    { encoding: 'utf-8' }
  )
}

module.exports = app
