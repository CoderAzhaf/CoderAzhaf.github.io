<?php
// filepath: c:\Users\mjama\OneDrive\Desktop\Azhaf codez\index.php
<?php
$blocked_ips = array('
45.22.61.221', '
45.22.61.221'); // Add the IP addresses you want to block

if (in_array($_SERVER['REMOTE_ADDR'], $blocked_ips)) {
    header('HTTP/1.0 403 Forbidden');
    exit('You are not allowed to access this page.');
}
?>
# filepath: /etc/nginx/nginx.conf
server {
    ...
    deny 
    45.22.61.221;
    ...
}