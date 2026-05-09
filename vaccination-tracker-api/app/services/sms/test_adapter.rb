module Sms
  class TestAdapter
    Delivery = Struct.new(:to, :body, keyword_init: true)

    class << self
      def deliver(to:, body:)
        deliveries << Delivery.new(to:, body:)
        true
      end

      def deliveries
        @deliveries ||= []
      end

      def clear
        deliveries.clear
      end
    end
  end
end
