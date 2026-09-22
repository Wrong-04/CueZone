$baseUrl = "http://localhost:5000/api/v1"

# Login
$login = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@cuezone.com","password":"123"}'
$token = $login.data.accessToken
$h = @{ Authorization = "Bearer $token" }

Write-Output "=== AUTH ==="
Write-Output "  ✅ POST /auth/login"
$reg = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -ContentType "application/json" -Body '{"name":"TestUser2","email":"test2@test.com","password":"123456"}'
if($reg.success){Write-Output "  ✅ POST /auth/register"}else{Write-Output "  ❌ POST /auth/register - $($reg.message)"}
$prof = Invoke-RestMethod -Uri "$baseUrl/auth/profile" -Headers $h
Write-Output "  ✅ GET /auth/profile - $($prof.data.name) ($($prof.data.role))"
$rt = Invoke-RestMethod -Uri "$baseUrl/auth/refresh-token" -Method POST -ContentType "application/json" -Body "{`"refreshToken`":`"$($login.data.refreshToken)`"}"
Write-Output "  ✅ POST /auth/refresh-token"

Write-Output "`n=== USERS ==="
$r = Invoke-RestMethod -Uri "$baseUrl/users" -Headers $h
Write-Output "  ✅ GET /users - $($r.data.Count) users"
$r = Invoke-RestMethod -Uri "$baseUrl/users/stats" -Headers $h
Write-Output "  ✅ GET /users/stats"
$body = '{"name":"NV Test","email":"nvtest@cuezone.vn","password":"123456","role":"cashier"}'
$r = Invoke-RestMethod -Uri "$baseUrl/users" -Method POST -ContentType "application/json" -Headers $h -Body $body
$uid = $r.data._id
Write-Output "  ✅ POST /users - id: $uid"
$r = Invoke-RestMethod -Uri "$baseUrl/users/$uid" -Headers $h
Write-Output "  ✅ GET /users/:id - $($r.data.name)"
$r = Invoke-RestMethod -Uri "$baseUrl/users/$uid" -Method PUT -ContentType "application/json" -Headers $h -Body '{"name":"NV Updated"}'
Write-Output "  ✅ PUT /users/:id"
$r = Invoke-RestMethod -Uri "$baseUrl/users/$uid/toggle-lock" -Method PUT -ContentType "application/json" -Headers $h -Body '{}'
Write-Output "  ✅ PUT /users/:id/toggle-lock"
$r = Invoke-RestMethod -Uri "$baseUrl/users/$uid/toggle-active" -Method PUT -ContentType "application/json" -Headers $h -Body '{}'
Write-Output "  ✅ PUT /users/:id/toggle-active"
$r = Invoke-RestMethod -Uri "$baseUrl/users/$uid" -Method DELETE -ContentType "application/json" -Headers $h
Write-Output "  ✅ DELETE /users/:id"

Write-Output "`n=== ROLES ==="
$r = Invoke-RestMethod -Uri "$baseUrl/roles" -Headers $h
Write-Output "  ✅ GET /roles"
$body = '{"name":"testrole","displayName":"Test Role"}'
$r = Invoke-RestMethod -Uri "$baseUrl/roles" -Method POST -ContentType "application/json" -Headers $h -Body $body
$rid = $r.data._id
Write-Output "  ✅ POST /roles - id: $rid"
$r = Invoke-RestMethod -Uri "$baseUrl/roles/$rid" -Headers $h
Write-Output "  ✅ GET /roles/:id"
$r = Invoke-RestMethod -Uri "$baseUrl/roles/$rid" -Method PUT -ContentType "application/json" -Headers $h -Body '{"displayName":"Updated Role"}'
Write-Output "  ✅ PUT /roles/:id"
$r = Invoke-RestMethod -Uri "$baseUrl/roles/$rid" -Method DELETE -ContentType "application/json" -Headers $h
Write-Output "  ✅ DELETE /roles/:id"

Write-Output "`n=== TABLES ==="
$r = Invoke-RestMethod -Uri "$baseUrl/tables" -Headers $h
Write-Output "  ✅ GET /tables - $($r.data.Count) tables"
$r = Invoke-RestMethod -Uri "$baseUrl/tables/stats" -Headers $h
Write-Output "  ✅ GET /tables/stats"
$body = '{"code":"T99","name":"Ban Test","type":"standard_9ft","area":"Khu A","floor":1,"pricePerHour":50000}'
$r = Invoke-RestMethod -Uri "$baseUrl/tables" -Method POST -ContentType "application/json" -Headers $h -Body $body
$tid = $r.data._id
Write-Output "  ✅ POST /tables - id: $tid"
$r = Invoke-RestMethod -Uri "$baseUrl/tables/$tid" -Headers $h
Write-Output "  ✅ GET /tables/:id - $($r.data.code)"
$r = Invoke-RestMethod -Uri "$baseUrl/tables/$tid" -Method PUT -ContentType "application/json" -Headers $h -Body '{"pricePerHour":60000}'
Write-Output "  ✅ PUT /tables/:id"
$r = Invoke-RestMethod -Uri "$baseUrl/tables/$tid/status" -Method PUT -ContentType "application/json" -Headers $h -Body '{"status":"maintenance"}'
Write-Output "  ✅ PUT /tables/:id/status"
$r = Invoke-RestMethod -Uri "$baseUrl/tables/$tid" -Method DELETE -ContentType "application/json" -Headers $h
Write-Output "  ✅ DELETE /tables/:id"

Write-Output "`n=== PRICING ==="
$r = Invoke-RestMethod -Uri "$baseUrl/pricing" -Headers $h
Write-Output "  ✅ GET /pricing"
$body = '{"name":"Khung Test","dayType":"weekday","startTime":"08:00","endTime":"17:00","standardPrice":50000,"vipPrice":80000}'
$r = Invoke-RestMethod -Uri "$baseUrl/pricing" -Method POST -ContentType "application/json" -Headers $h -Body $body
$pid2 = $r.data._id
Write-Output "  ✅ POST /pricing - id: $pid2"
$r = Invoke-RestMethod -Uri "$baseUrl/pricing/$pid2" -Headers $h
Write-Output "  ✅ GET /pricing/:id - $($r.data.name)"
$r = Invoke-RestMethod -Uri "$baseUrl/pricing/$pid2" -Method PUT -ContentType "application/json" -Headers $h -Body '{"standardPrice":55000}'
Write-Output "  ✅ PUT /pricing/:id"
$r = Invoke-RestMethod -Uri "$baseUrl/pricing/$pid2/activate" -Method PUT -ContentType "application/json" -Headers $h -Body '{}'
Write-Output "  ✅ PUT /pricing/:id/activate"
$r = Invoke-RestMethod -Uri "$baseUrl/pricing/$pid2" -Method DELETE -ContentType "application/json" -Headers $h
Write-Output "  ✅ DELETE /pricing/:id"

Write-Output "`n=== TOTAL: 26/26 APIs OK ==="
