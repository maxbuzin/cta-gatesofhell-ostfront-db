$ErrorActionPreference = 'Stop'
$Game = 'C:\Program Files (x86)\Steam\steamapps\common\Call to Arms - Gates of Hell'
$Out = Join-Path $PSScriptRoot '..\data\snapshots\game-units.json'
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Read-ZipText($zip, $name) {
  $e = $zip.GetEntry($name)
  if (-not $e) { return $null }
  $sr = New-Object IO.StreamReader($e.Open())
  $t = $sr.ReadToEnd()
  $sr.Close()
  return $t
}

function Strip-Semi([string]$text) {
  return [regex]::Replace($text, '(?m);[^\r\n]*', '')
}

function Get-Defines([string]$text) {
  $map = @{}
  $clean = Strip-Semi $text
  $i = 0
  $needle = '(define "'
  while (($i = $clean.IndexOf($needle, $i)) -ge 0) {
    $n0 = $i + $needle.Length
    $n1 = $clean.IndexOf('"', $n0)
    if ($n1 -lt 0) { break }
    $name = $clean.Substring($n0, $n1 - $n0)
    $d = 1
    $k = $n1 + 1
    while ($k -lt $clean.Length -and $d -gt 0) {
      $ch = $clean[$k]
      if ($ch -eq '(') { $d++ }
      elseif ($ch -eq ')') { $d-- }
      $k++
    }
    $map[$name] = $clean.Substring($n1 + 1, ($k - 1) - ($n1 + 1))
    $i = $k
  }
  return $map
}

function Parse-Args([string]$s) {
  $map = @{}
  $rx = [regex]'([A-Za-z_][A-Za-z0-9_]*)\(([^)]*)\)'
  foreach ($m in $rx.Matches($s)) { $map[$m.Groups[1].Value] = $m.Groups[2].Value.Trim() }
  return $map
}

function Expand-Calls([string]$text, $defines) {
  $rx = [regex]'\("([^"]+)"\s*((?:[A-Za-z_][A-Za-z0-9_]*\([^)]*\)\s*)*)\)'
  $cur = $text
  for ($pass = 0; $pass -lt 8; $pass++) {
    $ms = $rx.Matches($cur)
    if ($ms.Count -eq 0) { break }
    $changed = $false
    $sb = New-Object System.Text.StringBuilder
    $at = 0
    foreach ($m in $ms) {
      $name = $m.Groups[1].Value
      if (-not $defines.ContainsKey($name)) { continue }
      $changed = $true
      [void]$sb.Append($cur.Substring($at, $m.Index - $at))
      $body = $defines[$name]
      $args = Parse-Args $m.Groups[2].Value
      foreach ($key in ($args.Keys | Sort-Object { -$_.Length })) {
        $body = $body.Replace("%$key", [string]$args[$key])
      }
      [void]$sb.Append($body)
      $at = $m.Index + $m.Length
    }
    if (-not $changed) { break }
    [void]$sb.Append($cur.Substring($at))
    $cur = $sb.ToString()
  }
  return $cur
}

function Num($v) {
  if ($null -eq $v -or $v -eq '') { return $null }
  $n = 0.0
  if ([double]::TryParse([string]$v, [ref]$n)) { return $n }
  return $null
}

function Pen-Table($kind, $a, $b, $c, $d, $e, $range) {
  $pts = @{}
  if ($null -eq $a -or $null -eq $b) { return $pts }
  $pts['10'] = [math]::Round($a + 1.3 + (($a - $b) / 4.4), 1)
  $pts['30'] = $a
  $pts['100'] = $b
  if ($null -ne $c) { $pts['155'] = $c }
  if ($kind -eq 'penetration_long' -or $kind -eq 'penetration') {
    if ($null -ne $d) { $pts['205'] = $d }
  }
  if ($kind -eq 'penetration' -and $null -ne $e) {
    $pts['250'] = $e
    $pts['500'] = [math]::Round($e - (5 * ($a - $e)), 1)
  }
  if ($kind -eq 'penetration_long' -and $null -ne $d -and $null -ne $e -and $null -ne $range -and $range -gt 200) {
    $span = 250 - 200
    $t = ($range - 200) / $span
    if ($span -eq 0) { $t = 0 }
    $pts["$range"] = [math]::Round($e + ((250 - $range) / 50) * ($d - $e), 1)
  }
  return $pts
}

function Parse-WeaponRaw([string]$raw, [string]$expanded) {
  $shells = @()
  $penRx = [regex]'\("(penetration(?:_long|_medium|_short)?)"\s*((?:[A-Za-z_][A-Za-z0-9_]*\([^)]*\)\s*)*)\)'
  foreach ($m in $penRx.Matches($raw)) {
    $args = Parse-Args $m.Groups[2].Value
    $a = Num $args['a']; $b = Num $args['b']; $c = Num $args['c']; $d = Num $args['d']; $e = Num $args['e']
    $range = Num $args['range']
    $table = Pen-Table $m.Groups[1].Value $a $b $c $d $e $range
    $shells += [ordered]@{
      shell = $args['shell']
      curve = $m.Groups[1].Value
      pointBlank = $a
      at100 = $b
      pen = $table
    }
  }
  $vel = @{}
  $vm = [regex]::Match($raw, '\("velocity m/s"\s*((?:[A-Za-z_][A-Za-z0-9_]*\([^)]*\)\s*)*)\)')
  if ($vm.Success) {
    $va = Parse-Args $vm.Groups[1].Value
    foreach ($k in $va.Keys) { $vel[$k] = Num $va[$k] }
  }
  $vm2 = [regex]::Match($raw, '\("velocity"\s+mps\(([0-9.]+)\)\)')
  if ($vm2.Success) { $vel['mps'] = Num $vm2.Groups[1].Value }

  $cal = [regex]::Match($expanded, '\{calibre\s+([0-9.]+)\}')
  $rel = [regex]::Match($raw, '\("reload time"\s+seconds\(([0-9.]+)\)\)')
  if (-not $rel.Success) {
    $rels = [regex]::Matches($expanded, '\{rechargeTime\s+([0-9.]+)\}')
    if ($rels.Count -gt 0) { $rel = $rels[$rels.Count - 1] }
  }
  $rpmHits = @()
  foreach ($m in [regex]::Matches($expanded, '\{recoveryTime\s+\(\s*/\s*60\s+\(\s*\*\s*([0-9.]+)')) {
    $rpmHits += [pscustomobject]@{ i = $m.Index; v = $m.Groups[1].Value }
  }
  foreach ($m in [regex]::Matches($expanded, '\{recoveryTime\s+\(\s*/\s*60\s+([0-9.]+)')) {
    $rpmHits += [pscustomobject]@{ i = $m.Index; v = $m.Groups[1].Value }
  }
  if ($rpmHits.Count -eq 0) {
    foreach ($m in [regex]::Matches($expanded, 'rpm\(([0-9.]+)\)')) {
      $rpmHits += [pscustomobject]@{ i = $m.Index; v = $m.Groups[1].Value }
    }
  }
  $rpm = $null
  if ($rpmHits.Count -gt 0) { $rpm = $rpmHits | Sort-Object i | Select-Object -Last 1 }
  $rngs = [regex]::Matches($expanded, '\{range\s+([0-9.]+)\s+[0-9.]+\}')
  $rng = $null
  if ($rngs.Count -gt 0) { $rng = $rngs[$rngs.Count - 1] }
  $fts = [regex]::Matches($expanded, '\{FiringTimeout\s+([0-9.]+)')
  $ft = $null
  if ($fts.Count -gt 0) { $ft = $fts[$fts.Count - 1] }
  $r1s = [regex]::Matches($expanded, 'r1\(([0-9.]+)\)')
  $r1 = $null
  if ($r1s.Count -gt 0) { $r1 = $r1s[$r1s.Count - 1] }
  $filling = [regex]::Match($raw, '\{filling\s+"([^"]+)"')

  $apOrder = @('apcbche','apcbc','aphebc','aphe','apbc','apc','apche','ap','ap2')
  $ap = $null
  foreach ($want in $apOrder) {
    $hit = $shells | Where-Object { $_.shell -eq $want } | Select-Object -First 1
    if ($hit) { $ap = $hit; break }
  }

  return [ordered]@{
    calibre = $(if ($cal.Success) { Num $cal.Groups[1].Value } else { $null })
    reload = $(if ($rel.Success) { Num $rel.Groups[1].Value } else { $null })
    rpm = $(if ($rpm) { Num $rpm.v } else { $null })
    range = $(if ($rng) { Num $rng.Groups[1].Value } else { $null })
    shotInterval = $(if ($ft) { Num $ft.Groups[1].Value } else { $null })
    accuracy = $(if ($r1) { Num $r1.Groups[1].Value } else { $null })
    filling = $(if ($filling.Success) { $filling.Groups[1].Value } else { $null })
    velocity = $vel
    ammo = $shells
    ap = $(if ($ap) { [ordered]@{ shell = $ap.shell; pointBlank = $ap.pointBlank; at100 = $ap.at100 } } else { $null })
  }
}

function Parse-Items([string]$text) {
  $items = @()
  foreach ($m in [regex]::Matches($text, '\{item\s+"([^"]+)"([^}]*)\}')) {
    $rest = $m.Groups[2].Value
    $num = [regex]::Match($rest, '([0-9]+(?:\.[0-9]+)?)')
    $count = 1.0
    if ($num.Success) { $count = Num $num.Groups[1].Value }
    $items += [ordered]@{ id = $m.Groups[1].Value; count = $count }
  }
  return $items
}

function Parse-Armor([string]$text) {
  $plates = @()
  $clean = Strip-Semi $text
  $rx = [regex]'\{volume\s+"([^"]+)"'
  foreach ($m in $rx.Matches($clean)) {
    $start = $m.Index
    $d = 0
    $k = $start
    $seen = $false
    while ($k -lt $clean.Length) {
      if ($clean[$k] -eq '{') { $d++; $seen = $true }
      elseif ($clean[$k] -eq '}') { $d--; if ($seen -and $d -eq 0) { $k++; break } }
      $k++
    }
    $body = $clean.Substring($start, $k - $start)
    $th = [regex]::Match($body, '\{thickness\s+([0-9.]+)')
    if (-not $th.Success) { continue }
    $base = Num $th.Groups[1].Value
    $face = @{}
    foreach ($f in @('front','rear','top','bottom','side')) {
      $fm = [regex]::Match($body, "\{$f\s+([0-9.]+)\}")
      $face[$f] = $(if ($fm.Success) { Num $fm.Groups[1].Value } else { $base })
    }
    $cast = [regex]::Match($body, '\{CastSteel\s+([0-9.]+)\}')
    $plates += [ordered]@{
      volume = $m.Groups[1].Value
      thickness = $base
      front = $face['front']
      side = $face['side']
      rear = $face['rear']
      top = $face['top']
      bottom = $face['bottom']
      castSteel = $(if ($cast.Success) { Num $cast.Groups[1].Value } else { $null })
    }
  }
  return $plates
}

function Parse-VehicleDef([string]$text) {
  $clean = Strip-Semi $text
  $mass = [regex]::Match($clean, '\{mass\s+([0-9.]+)\}')
  $mob = $null
  $mm = [regex]::Match($clean, '\("(mobility_[^"]+)"\s*((?:[A-Za-z_][A-Za-z0-9_]*\([^)]*\)\s*)*)\)')
  if ($mm.Success) {
    $args = Parse-Args $mm.Groups[2].Value
    $mob = [ordered]@{ kind = $mm.Groups[1].Value }
    foreach ($k in @('speed','reverse','traverse','weight','power','track','fuel','range')) {
      if ($args.ContainsKey($k)) { $mob[$k] = Num $args[$k] }
    }
    if ($args.ContainsKey('type')) { $mob['fuelType'] = $args['type'] }
  }
  $places = @()
  foreach ($m in [regex]::Matches($clean, '\{place\s+"([^"]+)"')) {
    $start = $m.Index
    $d = 0; $k = $start; $seen = $false
    while ($k -lt $clean.Length) {
      if ($clean[$k] -eq '{') { $d++; $seen = $true }
      elseif ($clean[$k] -eq '}') { $d--; if ($seen -and $d -eq 0) { $k++; break } }
      $k++
    }
    $body = $clean.Substring($start, $k - $start)
    $w = [regex]::Match($body, '\{weapon\s+"([^"]+)"(?:\s+filling\s+"([^"]+)")?')
    if (-not $w.Success) { continue }
    $disp = [regex]::Match($body, 'dispersion\(([0-9.]+)\)')
    $zero = [regex]::Match($body, 'zeroing\(([0-9.]+)\)')
    $typ = [regex]::Match($body, '\{type\s+"([^"]+)"\}')
    $places += [ordered]@{
      place = $m.Groups[1].Value
      weapon = $w.Groups[1].Value
      filling = $(if ($w.Groups[2].Success) { $w.Groups[2].Value } else { $null })
      type = $(if ($typ.Success) { $typ.Groups[1].Value } else { $null })
      dispersion = $(if ($disp.Success) { Num $disp.Groups[1].Value } else { $null })
      zeroing = $(if ($zero.Success) { Num $zero.Groups[1].Value } else { $null })
    }
  }
  return [ordered]@{
    mass = $(if ($mass.Success) { Num $mass.Groups[1].Value } else { $null })
    mobility = $mob
    inventory = @(Parse-Items $clean)
    weapons = $places
  }
}

function Get-Calls([string]$text) {
  $calls = @()
  $rx = [regex]'\("([^"]+)"'
  foreach ($m in $rx.Matches($text)) {
    $start = $m.Index
    $d = 0; $k = $start; $seen = $false
    while ($k -lt $text.Length) {
      if ($text[$k] -eq '(') { $d++; $seen = $true }
      elseif ($text[$k] -eq ')') { $d--; if ($seen -and $d -eq 0) { $k++; break } }
      $k++
    }
    $body = $text.Substring($start, $k - $start)
    $calls += [pscustomobject]@{ name = $m.Groups[1].Value; body = $body; index = $start; end = $k }
  }
  return $calls
}

function Get-Blocks([string]$text) {
  $blocks = @()
  $rx = [regex]'\{"([^"]+)"'
  foreach ($m in $rx.Matches($text)) {
    $start = $m.Index
    $d = 0; $k = $start; $seen = $false
    while ($k -lt $text.Length) {
      if ($text[$k] -eq '{') { $d++; $seen = $true }
      elseif ($text[$k] -eq '}') { $d--; if ($seen -and $d -eq 0) { $k++; break } }
      $k++
    }
    $blocks += [pscustomobject]@{ id = $m.Groups[1].Value; index = $start; end = $k; body = $text.Substring($start, $k - $start) }
  }
  return $blocks
}

function Is-UnitMacro($name) {
  return $name -eq 'vehicle' -or $name -like 'vehicle*' -or $name -like 'squad_*' -or $name -like 'emplacement*' -or $name -like 'supply_*' -or $name -like 'towed*'
}

function Members-From($map) {
  $list = @()
  foreach ($k in $map.Keys) {
    if ($k -notmatch '^(c\d+|crew\d*|crew_v|crew_c)$') { continue }
    $parts = $map[$k].Split(':')
    if ($parts.Count -lt 2) { continue }
    $list += [ordered]@{ breed = $parts[0]; count = [int]$parts[1] }
  }
  return $list
}

function Gear-Of($items) {
  $g = [ordered]@{ grenades = 0; molotovs = 0; shovels = 0; binoculars = 0 }
  foreach ($it in $items) {
    $id = $it.id.ToLower()
    $n = $it.count
    if ($id -match 'molotov') { $g.molotovs += $n }
    elseif ($id -match 'shovel') { $g.shovels += $n }
    elseif ($id -match 'binoc') { $g.binoculars += $n }
    elseif ($id -match 'grenade') { $g.grenades += $n }
  }
  return $g
}

function Parse-Pot([string]$text) {
  $map = @{}
  $rx = [regex]'msgctxt "(?<ctx>[^"]+)"\s+msgid "(?<msg>(?:[^"\\]|\\.)*)"'
  foreach ($m in $rx.Matches($text)) {
    $ctx = $m.Groups['ctx'].Value
    if ($ctx -like 'info/*') { continue }
    $msg = $m.Groups['msg'].Value
    $leaf = ($ctx -split '/')[-1]
    if (-not $map.ContainsKey($leaf)) { $map[$leaf] = $msg }
    $map[$ctx] = $msg
  }
  return $map
}

$logic = [IO.Compression.ZipFile]::OpenRead((Join-Path $Game 'resource\gamelogic.pak'))
$veh = [IO.Compression.ZipFile]::OpenRead((Join-Path $Game 'resource\entity\-vehicle.pak'))
$loc = [IO.Compression.ZipFile]::OpenRead((Join-Path $Game 'localizations\default.pak'))

Write-Output 'defines'
$baseDefines = @{}
$presetByDir = @{}
$classCp = @{}
foreach ($e in $logic.Entries) {
  $n = $e.FullName
  if ($n.EndsWith('small_firearms_accuracy.inc')) {
    $got = Get-Defines (Read-ZipText $logic $n)
    foreach ($k in $got.Keys) { $baseDefines[$k] = $got[$k] }
  } elseif ($n.EndsWith('.presets')) {
    $parts = $n.Split('/')
    $dir = ($parts[0..($parts.Length - 2)] -join '/')
    $presetByDir[$dir] = Get-Defines (Read-ZipText $logic $n)
  } elseif ($n -match '/settings_inf\.set$') {
    $got = Get-Defines (Read-ZipText $logic $n)
    $roster = 'default'
    if ($n -match '/units/([^/]+)/settings_inf\.set$') { $roster = $Matches[1] }
    foreach ($k in $got.Keys) {
      if ($k -notlike 'inf_*') { continue }
      $cp = [regex]::Match($got[$k], '\{cp\s+([0-9.]+)\}')
      $cw = [regex]::Match($got[$k], '\{cw\s+([0-9.]+)\}')
      $classCp["$roster|$k"] = [ordered]@{
        cp = $(if ($cp.Success) { Num $cp.Groups[1].Value } else { $null })
        cw = $(if ($cw.Success) { Num $cw.Groups[1].Value } else { $null })
      }
    }
  }
}
Write-Output ("base " + $baseDefines.Count + " presetDirs " + $presetByDir.Count)

function Defines-For([string]$path) {
  $local = @{}
  foreach ($k in $baseDefines.Keys) { $local[$k] = $baseDefines[$k] }
  $parts = $path.Split('/')
  for ($i = 2; $i -lt $parts.Length - 1; $i++) {
    $dir = ($parts[0..$i] -join '/')
    if (-not $presetByDir.ContainsKey($dir)) { continue }
    foreach ($k in $presetByDir[$dir].Keys) { $local[$k] = $presetByDir[$dir][$k] }
  }
  return $local
}

Write-Output 'weapons'
$weapons = @{}
foreach ($e in $logic.Entries) {
  $n = $e.FullName
  if (-not $n.StartsWith('set/stuff/')) { continue }
  if ($e.Name -match '\.' -or $e.Name.StartsWith('.')) { continue }
  if ($e.Length -gt 200000) { continue }
  $raw = Read-ZipText $logic $n
  $expanded = Expand-Calls (Strip-Semi $raw) (Defines-For $n)
  $parsed = Parse-WeaponRaw $raw $expanded
  $parsed['id'] = $e.Name
  $parsed['path'] = $n
  if (-not $weapons.ContainsKey($e.Name)) { $weapons[$e.Name] = $parsed }
}
Write-Output ("weapons " + $weapons.Count)

Write-Output 'ammo'
$ammo = @{}
foreach ($e in $logic.Entries) {
  if (-not $e.FullName.StartsWith('set/stuff/') -or -not $e.Name.EndsWith('.ammo')) { continue }
  $raw = Read-ZipText $logic $e.FullName
  $from = [regex]::Match($raw, '\{from\s+"pattern\s+([^"]+)"')
  $mass = [regex]::Match($raw, '\{mass\s+([0-9.]+)\}')
  $id = $e.Name.Substring(0, $e.Name.Length - 5)
  $ammo[$id] = [ordered]@{
    id = $id
    pattern = $(if ($from.Success) { $from.Groups[1].Value } else { $null })
    mass = $(if ($mass.Success) { Num $mass.Groups[1].Value } else { $null })
  }
}
Write-Output ("ammo " + $ammo.Count)

Write-Output 'breeds'
$breeds = @{}
foreach ($e in $logic.Entries) {
  if (-not $e.FullName.StartsWith('set/breed/mp/') -or -not $e.Name.EndsWith('.set')) { continue }
  $raw = Read-ZipText $logic $e.FullName
  $rel = $e.FullName.Substring('set/breed/'.Length)
  if ($rel.EndsWith('.set')) { $rel = $rel.Substring(0, $rel.Length - 4) }
  $breeds[$rel] = Parse-Items $raw
}
Write-Output ("breeds " + $breeds.Count)

Write-Output 'infantry costs'
$soldier = @{}
foreach ($e in $logic.Entries) {
  if ($e.FullName -notmatch '/inf_[a-z]+\.set$') { continue }
  $roster = ($e.FullName -split '/')[3]
  $text = Strip-Semi (Read-ZipText $logic $e.FullName)
  foreach ($b in (Get-Blocks $text)) {
    $call = [regex]::Match($b.body, '\("(inf_[^"]+)"\s*((?:[A-Za-z_][A-Za-z0-9_]*\([^)]*\)\s*)*)\)')
    if (-not $call.Success) { continue }
    $args = Parse-Args $call.Groups[2].Value
    $cls = $call.Groups[1].Value
    $cp = $null; $cw = $null
    $ck = "$roster|$cls"
    if (-not $classCp.ContainsKey($ck)) { $ck = "default|$cls" }
    if ($classCp.ContainsKey($ck)) { $cp = $classCp[$ck].cp; $cw = $classCp[$ck].cw }
    $soldier["$roster|$($b.id)"] = [ordered]@{
      id = $b.id
      roster = $roster
      class = $cls
      side = $args['side']
      cost = $(Num $args['cost'])
      cp = $cp
      cw = $cw
    }
  }
}
Write-Output ("soldiers " + $soldier.Count)

function Parse-Research([string]$raw, [string]$side) {
  $nodes = @{}
  $section = $null
  $inPositions = $false
  $nodeRx = [regex]'\{(?:\s*tech\s+)?"([^"]+)"\s*requires\s*"([^"]*)"\s*costs\s*([0-9.]+)\s*position\s*(-?[0-9.]+)\s+(-?[0-9.]+)'
  $posRx = [regex]'\{"([^"]+)"\s+(-?[0-9.]+)\s+(-?[0-9.]+)\s*\}'
  foreach ($line in ($raw -split '\r?\n')) {
    $sec = [regex]::Match($line, ';//---(.+?)---')
    if ($sec.Success) { $section = $sec.Groups[1].Value.Trim(); continue }
    $trim = $line.Trim()
    if ($trim.StartsWith(';') -or $trim -eq '') { continue }
    if ($trim.StartsWith('{positions')) { $inPositions = $true; continue }
    if ($inPositions) {
      if ($trim -eq '}') { $inPositions = $false; continue }
      $pm = $posRx.Match($trim)
      if ($pm.Success -and -not $nodes.ContainsKey("$side|$($pm.Groups[1].Value)")) {
        $nodeId = $pm.Groups[1].Value
        $nodes["$side|$nodeId"] = [ordered]@{
          id = $nodeId
          side = $side
          name = $null
          tech = $false
          section = $null
          requires = @()
          costs = $null
          x = Num $pm.Groups[2].Value
          y = Num $pm.Groups[3].Value
        }
      }
      continue
    }
    $clean = Strip-Semi $line
    $m = $nodeRx.Match($clean)
    if (-not $m.Success) { continue }
    $id = $m.Groups[1].Value
    $nodes["$side|$id"] = [ordered]@{
      id = $id
      side = $side
      name = $null
      tech = [bool]($clean -match '\{\s*tech\s+"')
      section = $section
      requires = @($m.Groups[2].Value.Split(' ') | Where-Object { $_ })
      costs = Num $m.Groups[3].Value
      x = Num $m.Groups[4].Value
      y = Num $m.Groups[5].Value
    }
  }
  return $nodes
}

Write-Output 'research'
$research = @{}
foreach ($e in $logic.Entries) {
  if ($e.FullName -notmatch 'unit_research_([a-z]+)\.set$') { continue }
  $side = $Matches[1]
  $parsed = Parse-Research (Read-ZipText $logic $e.FullName) $side
  foreach ($k in $parsed.Keys) { $research[$k] = $parsed[$k] }
}
Write-Output ("research " + $research.Count)

Write-Output 'vehicles'
$vehicles = @{}
foreach ($e in $veh.Entries) {
  if (-not $e.FullName.EndsWith('.def')) { continue }
  if ($e.FullName -match '/x/') { continue }
  $id = [IO.Path]::GetFileNameWithoutExtension($e.Name)
  if ($vehicles.ContainsKey($id)) { continue }
  $def = Parse-VehicleDef (Read-ZipText $veh $e.FullName)
  $extPath = $e.FullName.Substring(0, $e.FullName.Length - 4) + '.ext'
  $ext = Read-ZipText $veh $extPath
  $armor = @()
  if ($ext) { $armor = @(Parse-Armor $ext) }
  $def['id'] = $id
  $def['armor'] = $armor
  $vehicles[$id] = $def
}
Write-Output ("vehicles " + $vehicles.Count)

Write-Output 'names'
$names = @{}
foreach ($e in $loc.Entries) {
  if (-not $e.Name.EndsWith('.pot')) { continue }
  if ($e.FullName -notmatch '/desc/') { continue }
  $got = Parse-Pot (Read-ZipText $loc $e.FullName)
  foreach ($k in $got.Keys) {
    if (-not $names.ContainsKey($k)) { $names[$k] = $got[$k] }
  }
}
Write-Output ("names " + $names.Count)
$namesLower = @{}
foreach ($k in @($names.Keys)) {
  $lk = $k.ToLower()
  if (-not $namesLower.ContainsKey($lk)) { $namesLower[$lk] = $names[$k] }
}

function Clean-Name($s) {
  if (-not $s) { return $null }
  return ([regex]::Replace([string]$s, '</?c(?:\([^)]*\))?>', '')).Trim()
}

function Lookup-Name($id) {
  if (-not $id) { return $null }
  if ($names.ContainsKey($id)) { return (Clean-Name $names[$id]) }
  $low = $id.ToLower()
  if ($namesLower.ContainsKey($low)) { return (Clean-Name $namesLower[$low]) }
  return $null
}

function Lookup-UnitName($id, $side) {
  $n = Lookup-Name $id
  if ($n) { return $n }
  if ($side) { return (Lookup-Name "$id($side)") }
  return $null
}

function Research-Name($id, $side) {
  $n = Lookup-Name $id
  if ($n) { return $n }
  $base = $id
  if ($id -match '^(.*)\([a-z]+\)$') { $base = $Matches[1] }
  return (Lookup-UnitName $base $side)
}

function Weapon-View($id, $extra) {
  if (-not $id -or -not $weapons.ContainsKey($id)) { return $null }
  $w = $weapons[$id]
  $obj = [ordered]@{
    id = $w.id
    name = $(Lookup-Name $w.id)
    calibre = $w.calibre
    reload = $w.reload
    rpm = $w.rpm
    range = $w.range
    shotInterval = $w.shotInterval
    accuracy = $w.accuracy
    dispersion = $null
    zeroing = $null
    place = $null
    type = $null
    filling = $w.filling
    velocity = $w.velocity
    ap = $w.ap
    ammo = $w.ammo
  }
  if ($extra) {
    foreach ($k in @('dispersion','zeroing','place','type','filling')) {
      if ($extra.Contains($k) -and $null -ne $extra[$k] -and $extra[$k] -ne '') { $obj[$k] = $extra[$k] }
    }
  }
  return $obj
}

foreach ($k in @($research.Keys)) {
  $research[$k].name = Research-Name $research[$k].id $research[$k].side
}

Write-Output 'units'
$units = @()
foreach ($e in $logic.Entries) {
  if ($e.FullName -notmatch '^set/multiplayer/units/(conquest|early|mid|late)/units_[a-z]+\.set$') { continue }
  $roster = $Matches[1]
  $text = Strip-Semi (Read-ZipText $logic $e.FullName)
  $blocks = @(Get-Blocks $text)
  $calls = @(Get-Calls $text)
  foreach ($call in $calls) {
    if (-not (Is-UnitMacro $call.name)) { continue }
    $args = Parse-Args $call.body
    $block = $blocks | Where-Object { $call.index -ge $_.index -and $call.index -lt $_.end } | Sort-Object { $_.end - $_.index } | Select-Object -First 1
    $id = $null
    if ($block) { $id = $block.id }
    elseif ($args.ContainsKey('name')) { $id = $args['name'] }
    else { continue }
    $side = $args['side']
    $period = $args['period']
    $members = @(Members-From $args)
    $explicitCost = $null
    if ($block) {
      $cm = [regex]::Match($block.body, '\{cost\s+([0-9.]+)\}')
      if ($cm.Success) { $explicitCost = Num $cm.Groups[1].Value }
    }
    $crewCost = 0.0
    $crewCp = 0.0
    $memberOut = @()
    $gearItems = @()
    $memberWeapons = @()
    foreach ($mem in $members) {
      $key = "$roster|mp/$side/$period/$($mem.breed)"
      $info = $null
      if ($soldier.ContainsKey($key)) { $info = $soldier[$key] }
      $mp = $null; $cp = $null
      if ($info) { $mp = $info.cost; $cp = $info.cp }
      if ($null -ne $mp) { $crewCost += ($mp * $mem.count) }
      if ($null -ne $cp) { $crewCp += ($cp * $mem.count) }
      $breedPath = "mp/$side/$period/$($mem.breed)"
      $inv = @()
      if ($breeds.ContainsKey($breedPath)) { $inv = @($breeds[$breedPath]) }
      foreach ($it in $inv) {
        $gearItems += [ordered]@{ id = $it.id; count = $it.count * $mem.count }
        if ($weapons.ContainsKey($it.id)) {
          $memberWeapons += $it.id
        }
      }
      $memberOut += [ordered]@{
        breed = $mem.breed
        count = $mem.count
        mp = $mp
        cp = $cp
        items = $inv
      }
    }
    $vehicleId = $null
    if ($args.ContainsKey('vehicle')) { $vehicleId = $args['vehicle'] }
    elseif ($vehicles.ContainsKey($id)) { $vehicleId = $id }
    $vehicleOut = $null
    $unitWeapons = @()
    if ($vehicleId -and $vehicles.ContainsKey($vehicleId)) {
      $v = $vehicles[$vehicleId]
      $vWeapons = @()
      foreach ($p in $v.weapons) {
        $view = Weapon-View $p.weapon ([ordered]@{
          dispersion = $p.dispersion
          zeroing = $p.zeroing
          place = $p.place
          type = $p.type
          filling = $p.filling
        })
        if ($view) { $vWeapons += $view; $unitWeapons += $view }
      }
      foreach ($it in $v.inventory) { $gearItems += $it }
      $vehicleOut = [ordered]@{
        id = $vehicleId
        name = $(Lookup-Name $vehicleId)
        mass = $v.mass
        mobility = $v.mobility
        armor = $v.armor
        inventory = $v.inventory
        weapons = $vWeapons
      }
    }
    $seenW = @{}
    foreach ($wid in $memberWeapons) {
      if ($seenW.ContainsKey($wid)) { continue }
      $seenW[$wid] = $true
      $view = Weapon-View $wid $null
      if ($view) { $unitWeapons += $view }
    }
    $baseCost = $explicitCost
    if ($null -eq $baseCost -and $args.ContainsKey('cost')) { $baseCost = Num $args['cost'] }
    $cost = $baseCost
    if ($null -eq $cost) { $cost = $crewCost }
    elseif ($call.name -like 'vehicle*' -or $call.name -like 'squad_vehicle*' -or $call.name -like 'emplacement*') { $cost = $baseCost + $crewCost }
    $cp = $null
    if ($args.ContainsKey('cp')) { $cp = Num $args['cp'] }
    if ($null -eq $cp -or $cp -eq 0) { $cp = $crewCp }
    $res = $null
    foreach ($rk in @("$side|$id", "$side|$id($side)")) {
      if ($research.ContainsKey($rk)) { $res = $research[$rk]; break }
    }
    $units += [ordered]@{
      id = $id
      name = $(Lookup-UnitName $id $side)
      roster = $roster
      side = $side
      period = $period
      minStage = $(if ($args.ContainsKey('min_stage')) { Num $args['min_stage'] } else { $null })
      maxStage = $(if ($args.ContainsKey('max_stage')) { Num $args['max_stage'] } else { $null })
      cp = $cp
      cw = $(if ($args.ContainsKey('cw')) { Num $args['cw'] } else { $null })
      baseCost = $baseCost
      crewCost = [math]::Round($crewCost, 2)
      cost = [math]::Round([double]$cost, 2)
      research = $res
      members = $memberOut
      gear = $(Gear-Of $gearItems)
      vehicle = $vehicleOut
      weapons = $unitWeapons
    }
  }
}
Write-Output ("units " + $units.Count)

$weaponList = @($weapons.Values | ForEach-Object {
  $w = $_
  [ordered]@{
    id = $w.id
    name = $(Lookup-Name $w.id)
    path = $w.path
    calibre = $w.calibre
    reload = $w.reload
    rpm = $w.rpm
    range = $w.range
    shotInterval = $w.shotInterval
    accuracy = $w.accuracy
    filling = $w.filling
    velocity = $w.velocity
    ap = $w.ap
    ammo = $w.ammo
  }
})

$researchList = @($research.Values | Sort-Object side, y, x, id)

$doc = [ordered]@{
  source = 'game_files'
  gamePath = $Game
  units = $units
  research = $researchList
  weapons = $weaponList
  ammo = @($ammo.Values)
}

Write-Output 'write'
$json = $doc | ConvertTo-Json -Depth 20
[IO.File]::WriteAllText($Out, $json)
Write-Output $Out
Write-Output ("bytes " + (Get-Item $Out).Length)

$logic.Dispose(); $veh.Dispose(); $loc.Dispose()
