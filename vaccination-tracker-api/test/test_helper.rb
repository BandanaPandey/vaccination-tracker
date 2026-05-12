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

    def with_env(overrides)
      original = overrides.keys.index_with { |key| ENV[key] }
      overrides.each { |key, value| value.nil? ? ENV.delete(key) : ENV[key] = value }
      yield
    ensure
      original.each { |key, value| value.nil? ? ENV.delete(key) : ENV[key] = value }
    end

    def with_singleton_method_stub(object, method_name, replacement)
      singleton_class = class << object; self; end
      original_defined = singleton_class.method_defined?(method_name)
      original_method = object.method(method_name) if original_defined

      singleton_class.send(:define_method, method_name) do |*args, **kwargs|
        if replacement.respond_to?(:call)
          replacement.call(*args, **kwargs)
        else
          replacement
        end
      end

      yield
    ensure
      if original_defined
        singleton_class.send(:define_method, method_name) do |*args, **kwargs, &block|
          original_method.call(*args, **kwargs, &block)
        end
      else
        singleton_class.send(:remove_method, method_name) rescue nil
      end
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
