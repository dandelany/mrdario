server {
  # don't forget to tell on which port this server listens
  listen [::]:80;
  listen 80;

  # listen on the www host
  server_name www.mrdar.io;

  # and redirect to the non-www host (declared below)
  return 301 $scheme://mrdar.io$request_uri;
}

server {
  listen [::]:80;
  listen 80;

  # The host name to respond to
  server_name mrdar.io;

  # Path for static files
  root /sites/example.com/public;

  #Specify a charset
  charset utf-8;

  # Custom 404 page
  error_page 404 /404.html;

  # Include the basic h5bp config set
  include h5bp/basic.conf;
}