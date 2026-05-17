using FluentValidation;
using InnoTrack.RDMS.Api.Application.Dtos.Auth;

namespace InnoTrack.RDMS.Api.Application.Validators;

public class LoginRequestValidator : AbstractValidator<LoginRequestDto>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(255);

        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(8)
            .MaximumLength(100);

        RuleFor(x => x.CaptchaToken)
            .NotEmpty();
    }
}
