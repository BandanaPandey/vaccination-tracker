return unless Rails.env.production?

missing_env_vars = ProductionEnvironment.missing_env_vars
return if missing_env_vars.empty?

raise <<~MESSAGE
  Missing required production environment variables:
  #{missing_env_vars.join("\n")}
MESSAGE
