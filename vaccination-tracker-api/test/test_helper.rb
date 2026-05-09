ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
require "rails/test_help"

module ActiveSupport
  class TestCase
    parallelize(workers: :number_of_processors)
    fixtures :all

    setup do
      ActionMailer::Base.deliveries.clear
      Sms::TestAdapter.clear if defined?(Sms::TestAdapter)
    end
  end
end

class ActionDispatch::IntegrationTest
  private

  def auth_headers_for(user)
    {
      "Authorization" => "Bearer #{AuthToken.issue_for(user)}"
    }
  end

  def json_response
    JSON.parse(response.body)
  end
end
