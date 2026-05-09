class ReminderMailer < ApplicationMailer
  def vaccine_reminder
    @user = params[:user]
    @candidate = params[:candidate]

    mail(
      to: @user.email,
      subject: "Vaccination reminder for #{@candidate.fetch(:profile_name)}: #{@candidate.fetch(:vaccine_name)}"
    )
  end
end
