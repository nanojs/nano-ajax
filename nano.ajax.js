/*
 *  nano Ajax plugin v1.0
 *  http://nanojs.org/plugins/ajax
 *
 *  Copyright (c) 2008-2015 James Watts
 *  https://github.com/jameswatts
 *
 *  This is FREE software, licensed under the GPL
 *  http://www.gnu.org/licenses/gpl.html
 */

if (nano) {
	nano.plugin({
		load: function _load(url, method, params, headers) {
			return nano.ajax[method || 'get'](url || '', params, function() { this.data.node.set(this.response.text); }, null, {node: this}, null, headers);
		},
		send: function _send(url, method, params, headers) {
			return nano.ajax[method || 'post'](url || '', params, function() { this.data.node.set(this.response.text); }, null, {node: this}, null, headers);
		}
	}, function() {
		this.reg({
			load: function(val) {
				this.load(val);
			}
		});
		this.ajax = {
			query: function _query(name) {
				var name = name + '=', url = document.URL;
				return (url.indexOf(name) !== -1)? url.substring(url.indexOf(name)+name.length).split('&', 2)[0] : null;
			},
			request: function _request(url, method, async, params, user, password, headers, data) {
				var obj = {};
				obj.url = url;
				obj.params = params || {};
				obj.method = (typeof method === 'string')? method : 'post';
				obj.async = (nano.isset(async))? true : async;
				obj.user = user || '';
				obj.password = password || '';
				obj.data = data || {};
				obj.request = (window.XMLHttpRequest)? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');
				if (obj.request) {
					if (obj.method.toLowerCase() === 'post') {
						obj.post = '';
						for (var param in obj.params) obj.post += param + '=' + params[param] + '&';
						obj.post = obj.post.substring(0, obj.post.length-1);
						obj.request.open(obj.method, obj.url, obj.async, obj.user, obj.password);
						obj.request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
					} else {
						url += (url.indexOf('?') === -1)? '?' : '&';
						for (var param in obj.params) url += param + '=' + params[param] + '&';
						obj.request.open(obj.method, url.substring(0, url.length-1), obj.async, obj.user, obj.password);
					}
					if (headers) {
						for (var header in headers) obj.request.setRequestHeader(header, headers[header]);
					}
					return obj;
				} else {
					return false;
				}
			},
			response: function _response(obj, fn, evt) {
				evt = evt || {};
				obj.request.onprogress = function(e) {
					if (typeof evt.progress === 'function') evt.progress.call(obj, e);
				};
				obj.request.onload = function(e) {
					if (typeof evt.load === 'function') evt.load.call(obj, e);
				};
				obj.request.onerror = function(e) {
					if (typeof evt.error === 'function') evt.error.call(obj, e);
				};
				obj.request.onabort = function(e) {
					if (typeof evt.abort === 'function') evt.abort.call(obj, e);
				};
				obj.request.onmessage = function(msg) {
					if (typeof evt.message === 'function') evt.message.call(obj, msg);
				};
				obj.request.onreadystatechange = function(e) {
					if (obj.request.readyState === 4) {
						obj.response = {
							request: obj.request,
							header: function _header(header) {
								return this.request.getResponseHeader(header);
							},
							status: obj.request.status,
							text: obj.request.responseText,
							xml: obj.request.responseXML,
							json: null,
							messages: null
						};
						if (nano.isset(obj.request.getResponseHeader('X-JSON'))) {
							try {
								eval('obj.response.json = ' + obj.request.getResponseHeader('X-JSON') + ';');
								if (nano.type(obj.response.json) !== 'object' && nano.type(obj.response.json) !== 'array') obj.response.json = null;
							} catch (e) {
								obj.response.json = null;
							}
						}
						if (nano.isset(obj.request.getResponseHeader('X-Messages'))) {
							try {
								eval('obj.response.messages = ' + obj.request.getResponseHeader('X-Messages') + ';');
								if (nano.type(obj.response.messages) === 'array') {
									for (var i = 0; i < obj.response.messages.length; i++) {
										if (typeof obj.request.message === 'function') obj.request.message.call(obj, obj.response.messages[i]);
									}
								}
							} catch (e) {
								obj.response.messages = null;
							}
						}
						if (obj.request.status === 200) {
							if (typeof fn === 'function') fn.call(obj);
						} else {
							if (typeof evt.error === 'function') evt.error.call(obj, e);
						}
					}
				};
				obj.request.send((obj.method.toLowerCase() === 'post')? obj.post : null);
				return obj;
			},
			get: function _get(url, params, fn, evt, headers, data) {
				return new this.response(new this.request(url || '/', 'get', true, params, null, null, headers, data), fn, evt);
			},
			post: function _post(url, params, fn, evt, headers, data) {
				return new this.response(new this.request(url || '/', 'post', true, params, null, null, headers, data), fn, evt);
			},
			encode: function _encode(params) {
				var query = [];
				for (var param in params) query.push(encodeURIComponent(param) + '=' + encodeURIComponent(params[param]));
				return query.join('&');
			},
			decode: function _decode(query) {
				query = query.split('&');
				var cut = null;
				var val = null;
				var params = {};
				for (var i = 0; i < query.length; i++) {
					cut = query[i].indexOf('=');
					val = query[i].substring(cut+1);
					params[query[i].substring(0, cut)] = (!isNaN(parseFloat(val)) && isFinite(val))? val-0 : ((val == '')? null : val);
				}
				return params;
			},
			json: function _json(obj) {
				if (typeof obj !== 'object' || obj === null) {
					if (typeof obj === 'string') obj = '"' + obj + '"';
					return new String(obj);
				}
				var json = [];
				var array = (nano.type(obj) === 'array');
				var val = null;
				for (var prop in obj) {
					val = obj[prop];
					if (typeof val === 'string') {
						val = '"' + val.replace(/"/, '\"') + '"';
					} else if (nano.type(val) === 'object' || nano.type(val) === 'array') {
						val = this.serialize(val);
					}
					json.push(((array)? '' : '"' + prop.replace(/"/, '\"') + '":') + String(val).replace(/"/, '\"'));
				}
				return ((array)? '[' : '{') + String(json) + ((array)? ']' : '}');
			},
			parse: function _parse(val) {
				if (val === '') return '""';
				try {
					eval('var obj = ' + val + ';');
				} catch (e) {
					return null;
				}
				return obj;
			}
		};
	});
}
