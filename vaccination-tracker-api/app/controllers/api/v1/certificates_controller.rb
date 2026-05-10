module Api
  module V1
    class CertificatesController < BaseController
      before_action :set_profile

      def show
        certificate = VaccinationCertificate.new(@profile, generated_at: Time.current)

        send_data certificate.call,
          filename: certificate.filename,
          type: "application/pdf",
          disposition: :attachment
      end

      private

      def set_profile
        @profile = current_user.profiles.find_by(id: params[:profile_id])
        return if @profile

        render_not_found
      end
    end
  end
end
