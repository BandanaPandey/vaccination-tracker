module Api
  module V1
    class VaccinationRecordsController < BaseController
      before_action :set_profile
      before_action :set_vaccination_record, only: %i[show update destroy]

      def index
        render json: records_payload(@profile.vaccination_records.ordered)
      end

      def show
        render json: vaccination_record_payload(@vaccination_record)
      end

      def create
        vaccination_record = @profile.vaccination_records.new(vaccination_record_attributes)
        attach_proof(vaccination_record)

        if vaccination_record.save
          render json: vaccination_record_payload(vaccination_record), status: :created
        else
          render json: { errors: vaccination_record.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def update
        purge_proof_if_requested(@vaccination_record)
        attach_proof(@vaccination_record)

        if @vaccination_record.update(vaccination_record_attributes)
          render json: vaccination_record_payload(@vaccination_record)
        else
          render json: { errors: @vaccination_record.errors.full_messages }, status: :unprocessable_entity
        end
      end

      def destroy
        @vaccination_record.destroy!
        head :no_content
      end

      private

      def set_profile
        @profile = current_user.profiles.find_by(id: params[:profile_id])
        return if @profile

        render_not_found
      end

      def set_vaccination_record
        @vaccination_record = @profile.vaccination_records.find_by(id: params[:id])
        return if @vaccination_record

        render_not_found
      end

      def vaccination_record_params
        params.require(:vaccination_record).permit(
          :vaccine_name,
          :date_administered,
          :dose_number,
          :provider,
          :notes,
          :proof,
          :remove_proof
        )
      end

      def vaccination_record_attributes
        vaccination_record_params.except(:proof, :remove_proof)
      end

      def attach_proof(vaccination_record)
        return unless vaccination_record_params[:proof].present?

        vaccination_record.proof.attach(vaccination_record_params[:proof])
      end

      def purge_proof_if_requested(vaccination_record)
        return unless ActiveModel::Type::Boolean.new.cast(vaccination_record_params[:remove_proof])
        return unless vaccination_record.proof.attached?

        vaccination_record.proof.purge
      end

      def vaccination_record_payload(vaccination_record)
        payload = {
          id: vaccination_record.id,
          profile_id: vaccination_record.profile_id,
          vaccine_name: vaccination_record.vaccine_name,
          date_administered: vaccination_record.date_administered&.iso8601,
          dose_number: vaccination_record.dose_number,
          provider: vaccination_record.provider,
          notes: vaccination_record.notes,
          proof_attached: vaccination_record.proof.attached?
        }

        if vaccination_record.proof.attached?
          payload[:proof_filename] = vaccination_record.proof.filename.to_s
          payload[:proof_content_type] = vaccination_record.proof.content_type
          payload[:proof_url] = Rails.application.routes.url_helpers.rails_blob_path(vaccination_record.proof, only_path: true)
        end

        payload
      end

      def records_payload(records)
        records.map { |record| vaccination_record_payload(record) }
      end
    end
  end
end
