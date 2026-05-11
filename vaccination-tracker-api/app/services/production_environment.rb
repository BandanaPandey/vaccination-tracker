class ProductionEnvironment
  CORE_ENV_VARS = %w[
    APP_HOST
    FRONTEND_APP_URL
    DATABASE_URL
    SECRET_KEY_BASE
    SMTP_ADDRESS
    SMTP_PORT
    SMTP_FROM_EMAIL
  ].freeze
  AMAZON_STORAGE_ENV_VARS = %w[
    AWS_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY
    AWS_REGION
    AWS_S3_BUCKET
  ].freeze

  class << self
    def required_env_vars(storage_service = ENV.fetch("ACTIVE_STORAGE_SERVICE", "amazon"))
      vars = CORE_ENV_VARS.dup
      vars.concat(AMAZON_STORAGE_ENV_VARS) if storage_service.to_s == "amazon"
      vars
    end

    def missing_env_vars(env = ENV, storage_service = env.fetch("ACTIVE_STORAGE_SERVICE", "amazon"))
      required_env_vars(storage_service).select { |key| env[key].blank? }
    end
  end
end
