#!/usr/bin/env node
// 找出污染测试环境的测试文件。只依赖 Node.js 标准库，Windows、macOS、Linux 都能运行。
//
// 用法：
//   node find-polluter.mjs --cmd "<测试命令>" --creates <路径> <候选测试文件...>
//   node find-polluter.mjs --cmd "<测试命令>" --victim <受影响的测试文件> <候选测试文件...>
//
// --cmd      运行测试的命令。{files} 会替换为本次要运行的测试文件；不含 {files} 时，文件追加在命令末尾。
//            --victim 模式要求命令在同一进程中按给定顺序串行运行这些文件。
// --creates  逐个运行候选文件，找出第一个运行后让 <路径> 出现的测试。
// --victim   受影响的测试单独运行通过、跟在候选文件后面运行失败时，二分查找是哪个候选文件造成的。
// --list     从文件读取候选测试文件，每行一个；候选文件很多、命令行过长时使用。
//
// 退出码：0 找到污染源；1 没有找到或无法定位到单个文件；2 参数有误或前提不满足。

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const USAGE = [
  "用法：",
  '  node find-polluter.mjs --cmd "<测试命令>" --creates <路径> <候选测试文件...>',
  '  node find-polluter.mjs --cmd "<测试命令>" --victim <受影响的测试文件> <候选测试文件...>',
  "  候选文件也可以用 --list <文件> 提供，每行一个。",
].join("\n");

export function parseArgs(argv) {
  const options = { files: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (["--cmd", "--creates", "--victim", "--list"].includes(arg)) {
      const value = argv[i + 1];
      if (value === undefined) throw new Error(`${arg} 缺少值`);
      options[arg.slice(2)] = value;
      i += 1;
    } else if (arg.startsWith("--")) {
      throw new Error(`未知参数：${arg}`);
    } else {
      options.files.push(arg);
    }
  }
  return options;
}

// Windows PowerShell 5.1 的 `>` 重定向会写出带 BOM 的 UTF-16 文件
export function readListFile(file) {
  const bytes = readFileSync(file);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return bytes.subarray(2).toString("utf16le");
  const text = bytes.toString("utf8");
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function quote(file) {
  return /^[\w./\\:@+-]+$/.test(file) ? file : `"${file.replace(/"/g, '\\"')}"`;
}

export function buildCommand(template, files) {
  const list = files.map(quote).join(" ");
  return template.includes("{files}")
    ? template.replaceAll("{files}", list)
    : `${template} ${list}`;
}

function runTests(template, files, cwd) {
  const result = spawnSync(buildCommand(template, files), { cwd, shell: true, stdio: "ignore" });
  if (result.error) throw result.error;
  return result.status === 0;
}

function findCreator({ cmd, creates, files }, cwd, log) {
  const target = path.resolve(cwd, creates);
  if (existsSync(target)) {
    return { code: 2, output: `${creates} 在运行任何测试之前就已存在，先删除它再查找。` };
  }
  for (const [index, file] of files.entries()) {
    log(`[${index + 1}/${files.length}] ${file}`);
    runTests(cmd, [file], cwd);
    if (existsSync(target)) {
      return { code: 0, output: `找到污染源：${file} 运行后出现了 ${creates}。`, polluter: file };
    }
  }
  return { code: 1, output: `逐个运行了 ${files.length} 个候选文件，都没有产生 ${creates}。` };
}

function bisectVictim({ cmd, victim, files }, cwd, log) {
  const candidates = files.filter((file) => path.resolve(cwd, file) !== path.resolve(cwd, victim));
  const fails = (set) => !runTests(cmd, [...set, victim], cwd);

  log(`单独运行 ${victim}`);
  if (!runTests(cmd, [victim], cwd)) {
    return {
      code: 2,
      output: `${victim} 单独运行就失败，问题不是其他测试造成的，按普通失败诊断。`,
    };
  }
  log(`运行全部 ${candidates.length} 个候选文件，再运行 ${victim}`);
  if (!fails(candidates)) {
    return {
      code: 2,
      output: `按给定顺序运行候选文件后，${victim} 仍然通过，无法复现。确认测试命令会串行运行，并且候选文件的顺序与失败时一致。`,
    };
  }

  let suspects = candidates;
  while (suspects.length > 1) {
    const middle = Math.ceil(suspects.length / 2);
    const [front, back] = [suspects.slice(0, middle), suspects.slice(middle)];
    log(`剩余 ${suspects.length} 个嫌疑文件，检查前 ${front.length} 个`);
    if (fails(front)) {
      suspects = front;
      continue;
    }
    log(`检查后 ${back.length} 个`);
    if (fails(back)) {
      suspects = back;
      continue;
    }
    return {
      code: 1,
      output: [
        `无法定位到单个文件：以下 ${suspects.length} 个文件分成两半后，单独任何一半都不会让 ${victim} 失败，污染需要多个测试共同作用：`,
        ...suspects.map((file) => `- ${file}`),
      ].join("\n"),
      suspects,
    };
  }
  return {
    code: 0,
    output: `找到污染源：先运行 ${suspects[0]} 再运行 ${victim} 就会失败。`,
    polluter: suspects[0],
  };
}

export function run(argv, { cwd = process.cwd(), log = () => {} } = {}) {
  let options;
  try {
    options = parseArgs(argv);
    if (options.list) {
      const listed = readListFile(path.resolve(cwd, options.list))
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      options.files.push(...listed);
    }
  } catch (error) {
    return { code: 2, output: `${error.message}\n${USAGE}` };
  }

  const modes = [options.creates, options.victim].filter((value) => value !== undefined);
  if (!options.cmd || modes.length !== 1 || options.files.length === 0) {
    return { code: 2, output: USAGE };
  }
  return options.creates !== undefined
    ? findCreator(options, cwd, log)
    : bisectVictim(options, cwd, log);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = run(process.argv.slice(2), { log: (line) => console.error(line) });
  console.log(result.output);
  process.exitCode = result.code;
}
