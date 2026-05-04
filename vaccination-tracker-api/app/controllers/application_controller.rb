class ApplicationController < ActionController::API
  private

  def current_user
    @current_user ||= AuthToken.user_from(bearer_token)
  end

  def authenticate_user!
    return if current_user.present?

    render json: { error: "Unauthorized" }, status: :unauthorized
  end

  def bearer_token
    request.authorization.to_s.split(" ", 2).last
  end
end
