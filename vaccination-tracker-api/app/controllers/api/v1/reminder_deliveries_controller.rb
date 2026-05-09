module Api
  module V1
    class ReminderDeliveriesController < BaseController
      def index
        render json: current_user.reminder_deliveries.ordered.map { |delivery| reminder_delivery_payload(delivery) }
      end

      private

      def reminder_delivery_payload(delivery)
        {
          id: delivery.id,
          profile_id: delivery.profile_id,
          profile_name: delivery.profile.name,
          channel: delivery.channel,
          status: delivery.status,
          kind: delivery.kind,
          vaccine_name: delivery.vaccine_name,
          due_date: delivery.due_date.iso8601,
          sent_at: delivery.sent_at.iso8601,
          error_message: delivery.error_message
        }
      end
    end
  end
end
