using FluentValidation;
using InnoTrack.RDMS.Api.Application.Dtos.Projects;

namespace InnoTrack.RDMS.Api.Application.Validators;

public class CreateProjectRequestValidator : AbstractValidator<CreateProjectRequestDto>
{
    public CreateProjectRequestValidator()
    {
        RuleFor(x => x.OrganizationId).NotEmpty();

        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(255);

        RuleFor(x => x.Priority)
            .NotEmpty()
            .Must(priority => new[] { "Low", "Medium", "High", "Critical" }.Contains(priority));

        RuleFor(x => x.LifecycleStage)
            .NotEmpty()
            .Must(stage => new[] { "Ideation", "Research", "Prototype", "Testing", "Launch", "Post-Launch Review" }.Contains(stage));
    }
}
