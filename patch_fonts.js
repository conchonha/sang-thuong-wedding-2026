const fs = require('fs');
const htmlFile = '/Users/sangtb/Documents/android project/web_cai_in_phieu/thiep-cuoi.html';
let html = fs.readFileSync(htmlFile, 'utf8');
const fontsCss = fs.readFileSync('google_fonts.css', 'utf8');
const linkTagRegex = /<link[^>]*href="https:\/\/fonts\.googleapis\.com\/css2\?family=[^>]*>/;
html = html.replace(linkTagRegex, `<style>\n${fontsCss}\n</style>`);
fs.writeFileSync(htmlFile, html);
