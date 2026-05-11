require "test_helper"

class ProductionEnvironmentTest < ActiveSupport::TestCase
  test "required env vars include amazon storage settings by default" do
    required = ProductionEnvironment.required_env_vars

    assert_includes required, "APP_HOST"
    assert_includes required, "DATABASE_URL"
    assert_includes required, "SMTP_FROM_EMAIL"
    assert_includes required, "AWS_S3_BUCKET"
  end

  test "required env vars exclude amazon settings when local storage is selected" do
    required = ProductionEnvironment.required_env_vars("local")

    assert_includes required, "APP_HOST"
    refute_includes required, "AWS_S3_BUCKET"
  end

  test "missing env vars reports blank values" do
    env = {
      "APP_HOST" => "api.example.com",
      "FRONTEND_APP_URL" => "https://app.example.com",
      "DATABASE_URL" => "postgres://example",
      "SECRET_KEY_BASE" => "secret",
      "SMTP_ADDRESS" => "",
      "SMTP_PORT" => "587",
      "SMTP_FROM_EMAIL" => "no-reply@example.com",
      "ACTIVE_STORAGE_SERVICE" => "amazon",
      "AWS_ACCESS_KEY_ID" => "key",
      "AWS_SECRET_ACCESS_KEY" => "",
      "AWS_REGION" => "ap-south-1",
      "AWS_S3_BUCKET" => "bucket"
    }

    missing = ProductionEnvironment.missing_env_vars(env)

    assert_includes missing, "SMTP_ADDRESS"
    assert_includes missing, "AWS_SECRET_ACCESS_KEY"
    refute_includes missing, "APP_HOST"
  end
end
