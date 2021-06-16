#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const argv = require('minimist')(process.argv.slice(2))
const { prompt } = require('enquirer')
const {
  green,
  blue,
  bgBlue,
  stripColors
} = require('kolorist')

const cwd = process.cwd()

const TEMPLATES = [
  ['⬢🦀', green('wasm-react')],
  ['⬢🦀', green('wasm-vue')],
  ['⬢', green('react-dva-ts')],
  ['🦕', blue('deno-oak')],
  ['🦕', blue('deno-vscode-cmd')],
]

const renameFiles = {
  _gitignore: '.gitignore'
}

async function init() {
  const pkgJson = fs.readFileSync('./package.json', { encoding: 'utf-8' })
  console.log(`${chalk.bold('xc-app')} ${chalk.gray(JSON.parse(pkgJson).version)}\n`)

  let targetDir = argv._[0]
  if (!targetDir) {
    /**
     * @type {{ name: string }}
     */
    const { name } = await prompt({
      type: 'input',
      name: 'name',
      message: `Project name:`,
      initial: 'vite-project'
    })
    targetDir = name
  }

  const pkgName = await getValidPackageName(targetDir)
  const root = path.join(cwd, targetDir)
  console.log(`\nScaffolding project in ${root}...`)

  if (!fs.existsSync(root)) {
    fs.mkdirSync(root, { recursive: true })
  } else {
    const existing = fs.readdirSync(root)
    if (existing.length) {
      /**
       * @type {{ yes: boolean }}
       */
      const { yes } = await prompt({
        type: 'confirm',
        name: 'yes',
        initial: 'Y',
        message:
          `Target directory ${targetDir} is not empty.\n` +
          `Remove existing files and continue?`
      })
      if (yes) {
        emptyDir(root)
      } else {
        return
      }
    }
  }

  // determine template
  let template = argv.t || argv.template
  let message = 'Select a template:'
  let isValidTemplate = false
  let templateSymbol = ''

  // --template expects a value
  if (typeof template === 'string') {
    const availableTemplates = TEMPLATES.map((template) => stripColors(template[1]))
    isValidTemplate = availableTemplates.includes(template)
    message = `${template} isn't a valid template. Please choose from below:`
  }

  if (!template || !isValidTemplate) {
    /**
     * @type {{ t: string }}
     */
    const { t } = await prompt({
      type: 'select',
      name: 't',
      message,
      choices: TEMPLATES.map(i => i.join(' ~> '))
    })

    const temp = t.split(' ~> ')
    template = stripColors(temp[1])
    templateSymbol = temp[0]
  }

  const templateDir = path.join(__dirname, `template-${template}`)

  const write = (file, content) => {
    const targetPath = renameFiles[file]
      ? path.join(root, renameFiles[file])
      : path.join(root, file)
    if (content) {
      fs.writeFileSync(targetPath, content)
    } else {
      copy(path.join(templateDir, file), targetPath)
    }
  }

  const files = fs.readdirSync(templateDir)
  for (const file of files.filter((f) => f !== 'package.json')) {
    write(file)
  }

  const cmdCd = () => {
    console.log(`\nDone. Now run:\n`)
    if (root !== cwd) {
      console.log(`  cd ${path.relative(cwd, root)}`)
    }
  }

  if (templateSymbol.indexOf('⬢') >= 0) {
    const pkg = require(path.join(templateDir, `package.json`))
    pkg.name = pkgName;
    write('package.json', JSON.stringify(pkg, null, 2))

    cmdCd()
    cmdNode()

    if (templateSymbol.indexOf('🦀') >= 0) {
      wasmLink()
    }
    return
  }

  cmdCd()

  if (/wasm|react|vue/.test(template)) {
    cmdNode()
    if (/wasm/.test(template)) {
      wasmLink()
    }
  }
}

function cmdNode() {
  const pkgManager = /yarn/.test(process.env.npm_execpath) ? 'yarn' : 'npm'
  console.log(`  ${pkgManager === 'yarn' ? `yarn` : `npm install`}`)
  console.log(`  ${pkgManager === 'yarn' ? `yarn dev` : `npm run dev`}`)
  console.log()
}

function wasmLink() {
  console.log(bgBlue(` [Rust]: https://www.rust-lang.org `))
  console.log(bgBlue(` [wasm-pack]: https://github.com/rustwasm/wasm-pack `))
  console.log(bgBlue(` [awesome-rsw]: https://github.com/lencx/awesome-rsw `))
  console.log(bgBlue(` [learn-wasm]: https://github.com/lencx/learn-wasm `))
  console.log(bgBlue(` [vite-plugin-rsw]: https://github.com/lencx/vite-plugin-rsw `))
  console.log(bgBlue(` [Awesome WebAssembly]: https://lencx.github.io/book/awesome/wasm.html `))
  console.log(bgBlue(` [WebAssembly入门]: https://lencx.github.io/book/wasm/rust_wasm_frontend.html `))
  console.log()
}

function copy(src, dest) {
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    copyDir(src, dest)
  } else {
    fs.copyFileSync(src, dest)
  }
}

function copyDir(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true })
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file)
    const destFile = path.resolve(destDir, file)
    copy(srcFile, destFile)
  }
}

function emptyDir(dir) {
  if (!fs.existsSync(dir)) {
    return
  }
  for (const file of fs.readdirSync(dir)) {
    const abs = path.resolve(dir, file)
    // baseline is Node 12 so can't use rmSync :(
    if (fs.lstatSync(abs).isDirectory()) {
      emptyDir(abs)
      fs.rmdirSync(abs)
    } else {
      fs.unlinkSync(abs)
    }
  }
}

async function getValidPackageName(projectName) {
  const packageNameRegExp = /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/
  if (packageNameRegExp.test(projectName)) {
    return projectName
  } else {
    const suggestedPackageName = projectName
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/^[._]/, '')
      .replace(/[^a-z0-9-~]+/g, '-')

    /**
     * @type {{ inputPackageName: string }}
     */
    const { inputPackageName } = await prompt({
      type: 'input',
      name: 'inputPackageName',
      message: `Package name:`,
      initial: suggestedPackageName,
      validate: (input) =>
        packageNameRegExp.test(input) ? true : 'Invalid package.json name'
    })
    return inputPackageName
  }
}

init().catch((e) => {
  console.error(e)
})
