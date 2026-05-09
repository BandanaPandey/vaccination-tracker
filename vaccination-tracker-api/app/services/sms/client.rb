module Sms
  class Client
    class << self
      def deliver(to:, body:)
        adapter.deliver(to:, body:)
      end

      private

      def adapter
        case ENV.fetch("SMS_DELIVERY_ADAPTER", "test")
        when "test"
          Sms::TestAdapter
        else
          Sms::TestAdapter
        end
      end
    end
  end
end
