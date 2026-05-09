module Api
  module V1
    class ReminderPreferencesController < BaseController
      def show
        render json: reminder_preference_payload(current_user)
      end

      def update
        preference = current_user.reminder_preference_or_default

        User.transaction do
          current_user.update!(phone_number: reminder_preference_params[:phone_number]) if reminder_preference_params.key?(:phone_number)
          preference.update!(reminder_preference_attributes)
        end

        render json: reminder_preference_payload(current_user)
      rescue ActiveRecord::RecordInvalid => error
        record = error.record
        render json: { errors: record.errors.full_messages }, status: :unprocessable_entity
      end

      private

      def reminder_preference_params
        params.require(:reminder_preference).permit(:email_enabled, :sms_enabled, :lead_days, :overdue_enabled, :phone_number)
      end

      def reminder_preference_attributes
        reminder_preference_params.except(:phone_number)
      end

      def reminder_preference_payload(user)
        preference = user.reminder_preference_or_default
        {
          email_enabled: preference.email_enabled,
          sms_enabled: preference.sms_enabled,
          lead_days: preference.lead_days,
          overdue_enabled: preference.overdue_enabled,
          phone_number: user.phone_number
        }
      end
    end
  end
end
