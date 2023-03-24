#!/usr/bin/env node
const fse = require('fs-extra');
const fs = require("fs");


// obtain template name
const t = process.argv.find(arg => arg.split('=')[0] == '-t')
if(typeof t === "undefined") {
    console.error( `Please provide template argument: -t=<template_name>`);
    process.exit()
}
const template = t.split('=')[1]

const srcRootDir = __dirname;
const srcDir = `${srcRootDir}/templates/${template}`
if (!fs.existsSync(srcDir)) {
    console.error( `Template ${template} doesn't exsist`);
    process.exit()
}

// obtain destination project name
const projectName = 'webglified'



// copy
const destRootDir = process.cwd();
const destDir = `${destRootDir}/${projectName}`


try {
  fse.copySync(srcDir, destDir, { overwrite: false })
  console.log('success!')
} catch (err) {
  console.error(err)
}