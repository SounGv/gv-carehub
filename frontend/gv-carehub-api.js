/* GV CareHub frontend adapter
 * Replace the current local casesDB calls with this adapter.
 */
(function (global) {
  'use strict';
  let baseUrl = '';

  function configure(url) { baseUrl = String(url || '').replace(/\/$/, ''); }

  async function get(action, params) {
    const query = new URLSearchParams(Object.assign({}, params || {}, { action }));
    const response = await fetch(baseUrl + '?' + query.toString());
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || 'API error');
    return data;
  }

  async function post(action, payload) {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({}, payload || {}, { action }))
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || 'API error');
    return data;
  }

  global.GVCareHubAPI = {
    configure,
    health: () => get('health'),
    track: (token) => get('status', { token }),
    search: (q) => get('search', { q }),
    report: (filters) => get('report', filters),
    createClaim: (payload) => post('create_claim', payload),
    receive: (claimNo, actor, note) => post('receive', { claim_no: claimNo, actor, note }),
    service: (claimNo, toStatus, actor, note) => post('service', { claim_no: claimNo, to_status: toStatus, actor, note }),
    ship: (payload) => post('ship', payload),
    linkClsbs: (payload) => post('link_clsbs', payload)
  };
})(window);
