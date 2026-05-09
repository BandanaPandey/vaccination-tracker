class ReminderRunJob < ApplicationJob
  queue_as :default

  def perform(user_id = nil)
    if user_id.present?
      user = User.find_by(id: user_id)
      return unless user

      ReminderRunner.call(user)
    else
      User.find_each do |user|
        ReminderRunner.call(user)
      end
    end
  end
end
