# fetch-script-server

> Web server for fetch-script

# Install

```bash
npm install fetch-script-server
```

# Usage

Start the server
```bash
npm start
```

## Scripts
You can add scripts to the `scripts/` directory, in order to make them accessible from the REST API.

Exemple: adding the following script in `scripts/get-users`:

```
$set apis.sample.baseUrl http://jsonplaceholder.typicode.com

/sample/users
```

Will be accessible at `http://localhost:3000/script/get-users` (provided a valid token for that script) and return:

```
{
  "errors": [],
  "out": [
    [{id:1, ...}, {id:2, ...}, {id:3, ...}, ...]
  ]
}
```

## Tokens

In order to get permission to execute fetch-script, you need a token.

A token gives access to scripts:

```
# tokens.json

{
  // this token has access to scripts "foo" and "bar"
  "abcdef": {
    "scripts": ["foo", "bar"]
  },

  // this token has access to all scripts
  "abc123": {
    "scripts": ["*"]
  }
}
```

Include your token in a `Private-token` header.