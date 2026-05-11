require "active_support/core_ext/integer/time"

Rails.application.configure do
  force_ssl = ActiveModel::Type::Boolean.new.cast(ENV.fetch("FORCE_SSL", "true"))
  app_host = ENV.fetch("APP_HOST")
  app_protocol = ENV.fetch("APP_PROTOCOL", force_ssl ? "https" : "http")
  smtp_authentication = ENV.fetch("SMTP_AUTHENTICATION", "plain").presence

  # Settings specified here will take precedence over those in config/application.rb.

  # Code is not reloaded between requests.
  config.enable_reloading = false

  # Eager load code on boot for better performance and memory savings (ignored by Rake tasks).
  config.eager_load = true

  # Full error reports are disabled.
  config.consider_all_requests_local = false

  # Cache assets for far-future expiry since they are all digest stamped.
  config.public_file_server.headers = { "cache-control" => "public, max-age=#{1.year.to_i}" }

  # Enable serving of images, stylesheets, and JavaScripts from an asset server.
  # config.asset_host = "http://assets.example.com"

  # Store uploaded files using the configured Active Storage service.
  config.active_storage.service = ENV.fetch("ACTIVE_STORAGE_SERVICE", "amazon").to_sym

  # Assume all access to the app is happening through a SSL-terminating reverse proxy.
  config.assume_ssl = force_ssl

  # Force all access to the app over SSL, use Strict-Transport-Security, and use secure cookies.
  config.force_ssl = force_ssl

  # Skip http-to-https redirect for the default health check endpoint.
  # config.ssl_options = { redirect: { exclude: ->(request) { request.path == "/up" } } }

  # Log to STDOUT with the current request id as a default log tag.
  config.log_tags = [ :request_id ]
  config.logger   = ActiveSupport::TaggedLogging.logger(STDOUT)

  # Change to "debug" to log everything (including potentially personally-identifiable information!).
  config.log_level = ENV.fetch("RAILS_LOG_LEVEL", "info")

  # Prevent health checks from clogging up the logs.
  config.silence_healthcheck_path = "/up"

  # Don't log any deprecations.
  config.active_support.report_deprecations = false

  # Replace the default in-process memory cache store with a durable alternative.
  # config.cache_store = :mem_cache_store

  # Run background work through Solid Queue in production.
  config.active_job.queue_adapter = :solid_queue

  # Raise delivery errors in production so reminder failures are visible.
  config.action_mailer.raise_delivery_errors = true
  config.action_mailer.perform_caching = false
  config.action_mailer.perform_deliveries = true
  config.action_mailer.delivery_method = :smtp

  # Set host to be used by links generated in mailer templates.
  config.action_mailer.default_url_options = {
    host: app_host,
    protocol: app_protocol
  }
  config.action_mailer.default_options = { from: ENV.fetch("SMTP_FROM_EMAIL") }
  config.action_mailer.smtp_settings = {
    address: ENV.fetch("SMTP_ADDRESS"),
    port: ENV.fetch("SMTP_PORT").to_i,
    domain: ENV.fetch("SMTP_DOMAIN", app_host),
    user_name: ENV["SMTP_USERNAME"].presence,
    password: ENV["SMTP_PASSWORD"].presence,
    authentication: smtp_authentication&.to_sym,
    enable_starttls_auto: ActiveModel::Type::Boolean.new.cast(ENV.fetch("SMTP_ENABLE_STARTTLS_AUTO", "true")),
    open_timeout: ENV.fetch("SMTP_OPEN_TIMEOUT", 5).to_i,
    read_timeout: ENV.fetch("SMTP_READ_TIMEOUT", 5).to_i
  }

  # Enable locale fallbacks for I18n (makes lookups for any locale fall back to
  # the I18n.default_locale when a translation cannot be found).
  config.i18n.fallbacks = true

  # Do not dump schema after migrations.
  config.active_record.dump_schema_after_migration = false

  # Only use :id for inspections in production.
  config.active_record.attributes_for_inspect = [ :id ]

  config.hosts = ENV.fetch("ALLOWED_HOSTS", app_host)
    .split(",")
    .map(&:strip)
    .reject(&:empty?)

  Rails.application.routes.default_url_options[:host] = app_host
  Rails.application.routes.default_url_options[:protocol] = app_protocol
end
