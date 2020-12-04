const settings = require("../settings.json");

if (settings.pterodactyl) if (settings.pterodactyl.domain) {
    if (settings.pterodactyl.domain.slice(-1) == "/") settings.pterodactyl.domain = settings.pterodactyl.domain.slice(0, -1);
};

const fetch = require('node-fetch');
const fs = require("fs");
const indexjs = require("../index.js");
const ejs = require("ejs");

module.exports.load = async function(app, db) {
    app.get("/setresources", async (req, res) => {
        let theme = indexjs.get(req);
    
        if (!req.session.pterodactyl) return four0four(req, res, theme);
        
        let cacheaccount = await fetch(
            settings.pterodactyl.domain + "/api/application/users/" + (await db.get("users-" + req.session.userinfo.id)) + "?include=servers",
            {
              method: "get",
              headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${settings.pterodactyl.key}` }
            }
        );
        if (await cacheaccount.statusText == "Not Found") return four0four(req, res, theme);
        let cacheaccountinfo = JSON.parse(await cacheaccount.text());
    
        req.session.pterodactyl = cacheaccountinfo.attributes;
        if (cacheaccountinfo.attributes.root_admin !== true) return four0four(req, res, theme);
    
        let failredirect = theme.settings.redirect.failedsetresources ? theme.settings.redirect.failedsetresources : "/";
    
        if (!req.query.id) return res.redirect(`${failredirect}?err=MISSINGID`);
    
        if (!(await db.get("users-" + req.query.id))) return res.redirect(`${failredirect}?err=INVALIDID`);
    
        let successredirect = theme.settings.redirect.setresources ? theme.settings.redirect.setresources : "/";
    
        if (req.query.ram || req.query.disk || req.query.cpu || req.query.servers) {
            let ramstring = req.query.ram;
            let diskstring = req.query.disk;
            let cpustring = req.query.cpu;
            let serversstring = req.query.servers;

            let currentextra = await db.get("extra-" + req.query.id);
            let extra;

            if (typeof currentextra == "object") {
                extra = currentextra;
            } else {
                extra = {
                    ram: 0,
                    disk: 0,
                    cpu: 0,
                    servers: 0
                }
            }

            if (ramstring) {
                let ram = parseFloat(ramstring);
                if (ram < 0 || ram > 999999999999999) {
                    return res.redirect(`${failredirect}?err=RAMSIZE`);
                }
                extra.ram = ram;
            }
            
            if (diskstring) {
                let disk = parseFloat(diskstring);
                if (disk < 0 || disk > 999999999999999) {
                    return res.redirect(`${failredirect}?err=DISKSIZE`);
                }
                extra.disk = disk;
            }
            
            if (cpustring) {
                let cpu = parseFloat(cpustring);
                if (cpu < 0 || cpu > 999999999999999) {
                    return res.redirect(`${failredirect}?err=CPUSIZE`);
                }
                extra.cpu = cpu;
            }

            if (serversstring) {
                let servers = parseFloat(serversstring);
                if (servers < 0 || servers > 999999999999999) {
                    return res.redirect(`${failredirect}?err=SERVERSIZE`);
                }
                extra.servers = servers;
            }
            
            if (extra.ram == 0 && extra.disk == 0 && extra.cpu == 0 && extra.servers == 0) {
                await db.delete("extra-" + req.query.id);
            } else {
                await db.set("extra-" + req.query.id, extra);
            }

            return res.redirect(successredirect + "?err=none");
        } else {
            res.redirect(`${failredirect}?err=MISSINGVARIABLES`);
        }
      });    


  app.get("/setplan", async (req, res) => {
    let theme = indexjs.get(req);

    if (!req.session.pterodactyl) return four0four(req, res, theme);
    
    let cacheaccount = await fetch(
        settings.pterodactyl.domain + "/api/application/users/" + (await db.get("users-" + req.session.userinfo.id)) + "?include=servers",
        {
          method: "get",
          headers: { 'Content-Type': 'application/json', "Authorization": `Bearer ${settings.pterodactyl.key}` }
        }
    );
    if (await cacheaccount.statusText == "Not Found") return four0four(req, res, theme);
    let cacheaccountinfo = JSON.parse(await cacheaccount.text());

    req.session.pterodactyl = cacheaccountinfo.attributes;
    if (cacheaccountinfo.attributes.root_admin !== true) return four0four(req, res, theme);

    let failredirect = theme.settings.redirect.failedsetplan ? theme.settings.redirect.failedsetplan : "/";

    if (!req.query.id) return res.redirect(`${failredirect}?err=MISSINGID`);

    if (!(await db.get("users-" + req.query.id))) return res.redirect(`${failredirect}?err=INVALIDID`);

    let successredirect = theme.settings.redirect.setplan ? theme.settings.redirect.setplan : "/";

    if (!req.query.package) {
        await db.delete("package-" + req.query.id);
        return res.redirect(successredirect + "?err=none");
    } else {
        let newsettings = JSON.parse(fs.readFileSync("./settings.json").toString());
        if (!newsettings.api.client.packages.list[req.query.package]) return res.redirect(`${failredirect}?err=INVALIDPACKAGE`);
        await db.set("package-" + req.query.id, req.query.package);
        return res.redirect(successredirect + "?err=none");
    }
  });

    async function four0four(req, res, theme) {
        ejs.renderFile(
            `./themes/${theme.name}/${theme.settings.notfound}`, 
            await eval(indexjs.renderdataeval),
            null,
        function (err, str) {
            delete req.session.newaccount;
            if (err) {
                console.log(`[WEBSITE] An error has occured on path ${req._parsedUrl.pathname}:`);
                console.log(err);
                return res.send("An error has occured while attempting to load this page. Please contact an administrator to fix this.");
            };
            res.send(str);
        });
    }
};