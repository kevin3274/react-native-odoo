'use strict'

var Odoo = function (config) {
  config = config || {}

  this.host = config.host
  this.port = config.port || 80
  this.database = config.database
  this.username = config.username || null
  this.password = config.password || null
  this.sid = config.sid || null
  this.protocol = config.protocol || 'http'
}

// Connect
Odoo.prototype.connect = function () {
  var params = {
    db: this.database,
    login: this.username,
    password: this.password
  }

  var json = JSON.stringify({ params: params })
  var url = `${this.protocol}://${this.host}:${this.port}/web/session/authenticate`

  var options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Content-Length': json.length
    },
    body: json,
    credentials: 'omit'
  }

  var context = this

  return fetch(url, options)
    .then(function (response) {
      context.sid = response.headers.map['set-cookie'].split(';')[0].split('=')[1];
      context.cookie = response.headers.map['set-cookie'];
      return response.json()
    })
    .then(function (responseJson) {
      if (responseJson.error) return { success: false, error: responseJson.error }
      else {
        context.uid = responseJson.result.uid
        context.session_id = responseJson.result.session_id
        context.context = responseJson.result.user_context
        context.username = responseJson.result.username
        return { success: true, data: responseJson.result }
      }
    })
    .catch(function (error) {
      return { success: false, error: error }
    })
}

// Search records
Odoo.prototype.search = function (model, params, context) {
  return this._request('/web/dataset/call_kw', {
    kwargs: {
      context: {...this.context, ...context}
    },
    model: model,
    method: 'search',
    args: [
      params.domain,
    ],
  })
}

// Search & Read records
Odoo.prototype.search_read = function (model, params, context) {

  return this._request('/web/dataset/call_kw', {
    model: model,
    method: 'search_read',
    args: [],
    kwargs: {
      context: {...this.context, ...context},
      domain: params.domain,
      offset: params.offset,
      limit: params.limit,
      order: params.order,
      fields: params.fields,
    },
  })
}

// Read records
Odoo.prototype.get = function (model, params, context) {
  return this._request('/web/dataset/call_kw', {
    model: model,
    method: 'read',
    args: [
      params.ids,
    ],
    kwargs: {
      context: {...this.context, ...context},
      fields: params.fields,
    },
  })
}

// Read Group
Odoo.prototype.read_group = function(model, params, context) {
  return this._request("/web/dataset/call_kw", {
    model: model,
    method: "read_group",
    args: [],
    kwargs: {
      context: { ...this.context, ...context },
      domain: params.domain,
      fields: params.fields,
      groupby: params.groupby,
      lazy: params.lazy,
      orderby: params.order
    },
  })
}

// Browse records by ID
// Not a direct implementation of Odoo RPC 'browse' but rather a workaround based on 'search_read'
Odoo.prototype.browse_by_id = function (model, params) {
  params.domain = [['id', '>', '0']]
  this.search_read(model, params)
    .then(function (response) {
      return response
    })
}


// Create records
Odoo.prototype.create = function (model, params, context) {
  return this._request('/web/dataset/call_kw', {
    kwargs: {
      context: {...this.context, ...context}
    },
    model: model,
    method: 'create',
    args: [params]
  })
}

// Update records
Odoo.prototype.update = function (model, ids, params, context) {
  if (ids) {
    return this._request('/web/dataset/call_kw', {
      kwargs: {
        context: {...this.context, ...context}
      },
      model: model,
      method: 'write',
      args: [ids, params]
    })
  }
}

// Delete records
Odoo.prototype.delete = function (model, ids, context) {
  if (ids) {
    return this._request('/web/dataset/call_kw', {
      kwargs: {
        context: {...this.context, ...context}
      },
      model: model,
      method: 'unlink',
      args: [ids]
    })
  }
}

// Generic RPC wrapper
Odoo.prototype.rpc_call = function (endpoint, params) {
  return this._request(endpoint, params)
}

// Private functions
Odoo.prototype._request = function (path, params) {
  params = params || {}

  var url = `${this.protocol}://${this.host}:${this.port}${path || '/'}`
  var options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cookie': this.cookie
    },
    credentials: 'omit',
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: new Date().getUTCMilliseconds(),
      method: 'call',
      params: params
    })
  }

  return fetch(url, options)
    .then(function (response) {
      return response.json()
    })
    .then(function (responseJson) {
      if (responseJson.error) return { success: false, error: responseJson.error }
      else return { success: true, data: responseJson.result }
    })
    .catch(function (error) {
      return { success: false, error: error }
    })
}

module.exports = Odoo
