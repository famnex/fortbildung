const ActiveDirectory = require('activedirectory2');

async function authenticateLDAP(settings, username, password) {
  if (!settings || !settings.ldap_enabled) {
    return null;
  }

  const url = `${settings.ldap_use_ssl ? 'ldaps' : 'ldap'}://${settings.ldap_server}:${settings.ldap_port}`;
  
  const config = {
    url: url,
    baseDN: settings.ldap_base_dn,
    username: settings.ldap_bind_dn,
    password: settings.ldap_bind_password,
  };

  return new Promise((resolve) => {
    try {
      const ad = new ActiveDirectory(config);
      const userAttr = settings.ldap_user_attr || 'sAMAccountName';
      
      ad.findUser(username, (err, user) => {
        if (err || !user) {
          // Fallback to custom search query if AD search defaults aren't matched
          const filter = `(${userAttr}=${username})`;
          ad.find(filter, (findErr, results) => {
            if (findErr || !results || !results.users || results.users.length === 0) {
              return resolve(null);
            }
            const foundUser = results.users[0];
            bindAndExtract(foundUser);
          });
          return;
        }
        bindAndExtract(user);
      });

      function bindAndExtract(user) {
        // Authenticate the user by binding
        ad.authenticate(user.dn, password, (authErr, authSuccess) => {
          if (authErr || !authSuccess) {
            return resolve(null);
          }
          
          const mailAttr = settings.ldap_mail_attr || 'mail';
          const displayAttr = settings.ldap_display_attr || 'displayName';
          
          resolve({
            email: user[mailAttr] || username,
            name: user[displayAttr] || user.cn || username
          });
        });
      }
    } catch (e) {
      console.error('LDAP authentication error:', e);
      resolve(null);
    }
  });
}

module.exports = { authenticateLDAP };
