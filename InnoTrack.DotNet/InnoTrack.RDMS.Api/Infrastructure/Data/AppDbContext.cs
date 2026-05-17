using InnoTrack.RDMS.Api.Domain.Entities;
using InnoTrack.RDMS.Api.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace InnoTrack.RDMS.Api.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    private static readonly ValueConverter<AppRole, string> AppRoleConverter = new(
        role => ConvertAppRoleToDatabase(role),
        value => ParseAppRole(value));

    private static readonly ValueConverter<ProjectStatus, string> ProjectStatusConverter = new(
        status => ConvertProjectStatusToDatabase(status),
        value => ParseProjectStatus(value));

    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Profile> Profiles => Set<Profile>();
    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<ProjectMember> ProjectMembers => Set<ProjectMember>();
    public DbSet<ProjectTask> ProjectTasks => Set<ProjectTask>();
    public DbSet<TaskComment> TaskComments => Set<TaskComment>();
    public DbSet<Milestone> Milestones => Set<Milestone>();
    public DbSet<ProjectStatusHistory> ProjectStatusHistory => Set<ProjectStatusHistory>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();
    public DbSet<OrganizationSubscription> OrganizationSubscriptions => Set<OrganizationSubscription>();
    public DbSet<PaymentTransaction> PaymentTransactions => Set<PaymentTransaction>();
    public DbSet<PendingPublicOnboarding> PendingPublicOnboardings => Set<PendingPublicOnboarding>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<DocumentVersion> DocumentVersions => Set<DocumentVersion>();
    public DbSet<DocumentCategory> DocumentCategories => Set<DocumentCategory>();
    public DbSet<DocumentTag> DocumentTags => Set<DocumentTag>();
    public DbSet<DocumentTagMap> DocumentTagMap => Set<DocumentTagMap>();
    public DbSet<DocumentAccessLog> DocumentAccessLogs => Set<DocumentAccessLog>();
    public DbSet<Channel> Channels => Set<Channel>();
    public DbSet<ChannelMember> ChannelMembers => Set<ChannelMember>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<MessageAttachment> MessageAttachments => Set<MessageAttachment>();
    public DbSet<MessageReaction> MessageReactions => Set<MessageReaction>();
    public DbSet<Announcement> Announcements => Set<Announcement>();
    public DbSet<AnnouncementReadReceipt> AnnouncementReadReceipts => Set<AnnouncementReadReceipt>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<SecurityEvent> SecurityEvents => Set<SecurityEvent>();
    public DbSet<FailedLoginAttempt> FailedLoginAttempts => Set<FailedLoginAttempt>();
    public DbSet<UnmaskRequest> UnmaskRequests => Set<UnmaskRequest>();
    public DbSet<UnmaskLog> UnmaskLogs => Set<UnmaskLog>();
    public DbSet<AuthenticationLog> AuthenticationLogs => Set<AuthenticationLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AppUser>(entity =>
        {
            entity.ToTable("app_users");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.FirstName).HasColumnName("first_name").HasMaxLength(100).IsRequired();
            entity.Property(x => x.LastName).HasColumnName("last_name").HasMaxLength(100).IsRequired();
            entity.Property(x => x.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
            entity.Property(x => x.Phone).HasColumnName("phone").HasMaxLength(20);
            entity.Property(x => x.PasswordHash).HasColumnName("password_hash").HasMaxLength(255);
            entity.Property(x => x.SecurityQuestion).HasColumnName("security_question").HasMaxLength(255);
            entity.Property(x => x.SecurityAnswerHash).HasColumnName("security_answer_hash").HasMaxLength(255);
            entity.Property(x => x.MustChangePassword).HasColumnName("must_change_password");
            entity.Property(x => x.RoleId).HasColumnName("role_id");
            entity.Property(x => x.OrganizationId).HasColumnName("organization_id");
            entity.Property(x => x.TeamId).HasColumnName("team_id");
            entity.Property(x => x.IsActive).HasColumnName("is_active");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(x => x.Role)
                .WithMany(r => r.Users)
                .HasForeignKey(x => x.RoleId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.Organization)
                .WithMany(o => o.Users)
                .HasForeignKey(x => x.OrganizationId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(x => x.Team)
                .WithMany(team => team.Users)
                .HasForeignKey(x => x.TeamId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.ToTable("roles");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.RoleName).HasColumnName("role_name").HasMaxLength(64).IsRequired();
            entity.Property(x => x.Description).HasColumnName("description").HasMaxLength(255).IsRequired();

            entity.HasData(
                new Role { Id = 1, RoleName = "SuperAdmin", Description = "Platform-wide control" },
                new Role { Id = 2, RoleName = "SystemAdmin", Description = "Manages users and settings" },
                new Role { Id = 3, RoleName = "ProjectManager", Description = "Manages projects and tasks" },
                new Role { Id = 4, RoleName = "TeamMember", Description = "Updates assigned work" }
            );
        });

        modelBuilder.Entity<Profile>(entity =>
        {
            entity.ToTable("profiles");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.FullName).HasColumnName("full_name").HasMaxLength(255);
            entity.Property(x => x.AvatarUrl).HasColumnName("avatar_url").HasMaxLength(500);
            entity.Property(x => x.OrganizationId).HasColumnName("organization_id");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(x => x.User)
                .WithOne(u => u.Profile)
                .HasForeignKey<Profile>(x => x.Id)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Organization)
                .WithMany(o => o.Profiles)
                .HasForeignKey(x => x.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Organization>(entity =>
        {
            entity.ToTable("organizations");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
            entity.Property(x => x.Plan).HasColumnName("plan").HasMaxLength(50).IsRequired();
            entity.Property(x => x.ApprovalStatus).HasColumnName("approval_status").HasMaxLength(32).IsRequired();
            entity.Property(x => x.Active).HasColumnName("active");
            entity.Property(x => x.Email).HasColumnName("email").HasMaxLength(255);
            entity.Property(x => x.Phone).HasColumnName("phone").HasMaxLength(50);
            entity.Property(x => x.Address).HasColumnName("address").HasMaxLength(500);
            entity.Property(x => x.ContactPerson).HasColumnName("contact_person").HasMaxLength(255);
            entity.Property(x => x.ContactRole).HasColumnName("contact_role").HasMaxLength(120);
            entity.Property(x => x.Industry).HasColumnName("industry").HasMaxLength(120);
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<PendingPublicOnboarding>(entity =>
        {
            entity.ToTable("pending_public_onboardings");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.CompanyName).HasColumnName("company_name").HasMaxLength(255).IsRequired();
            entity.Property(x => x.Industry).HasColumnName("industry").HasMaxLength(120).IsRequired();
            entity.Property(x => x.FirstName).HasColumnName("first_name").HasMaxLength(100).IsRequired();
            entity.Property(x => x.LastName).HasColumnName("last_name").HasMaxLength(100).IsRequired();
            entity.Property(x => x.Email).HasColumnName("email").HasMaxLength(255).IsRequired();
            entity.Property(x => x.PhoneNumber).HasColumnName("phone_number").HasMaxLength(20);
            entity.Property(x => x.EncryptedPassword).HasColumnName("encrypted_password").HasColumnType("LONGTEXT").IsRequired();
            entity.Property(x => x.PlanId).HasColumnName("plan_id").HasMaxLength(50).IsRequired();
            entity.Property(x => x.PaymentMethod).HasColumnName("payment_method").HasMaxLength(40).IsRequired();
            entity.Property(x => x.Amount).HasColumnName("amount").HasPrecision(18, 2);
            entity.Property(x => x.Status).HasColumnName("status").HasMaxLength(40).IsRequired();
            entity.Property(x => x.PayMongoCheckoutSessionId).HasColumnName("paymongo_checkout_session_id").HasMaxLength(80);
            entity.Property(x => x.PayMongoCheckoutUrl).HasColumnName("paymongo_checkout_url").HasColumnType("LONGTEXT");
            entity.Property(x => x.PayMongoPaymentId).HasColumnName("paymongo_payment_id").HasMaxLength(80);
            entity.Property(x => x.PayMongoReferenceNumber).HasColumnName("paymongo_reference_number").HasMaxLength(80);
            entity.Property(x => x.GatewayMessage).HasColumnName("gateway_message").HasColumnType("LONGTEXT");
            entity.Property(x => x.PaidAt).HasColumnName("paid_at");
            entity.Property(x => x.ExpiresAt).HasColumnName("expires_at");
            entity.Property(x => x.OrganizationId).HasColumnName("organization_id");
            entity.Property(x => x.AdminUserId).HasColumnName("admin_user_id");
            entity.Property(x => x.PaymentReference).HasColumnName("payment_reference").HasMaxLength(80);
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<Team>(entity =>
        {
            entity.ToTable("teams");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.OrganizationId).HasColumnName("organization_id");
            entity.Property(x => x.Name).HasColumnName("name").HasMaxLength(150).IsRequired();
            entity.Property(x => x.Description).HasColumnName("description").HasMaxLength(500);
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(x => x.Organization)
                .WithMany(organization => organization.Teams)
                .HasForeignKey(x => x.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => new { x.OrganizationId, x.Name }).IsUnique();
        });

        modelBuilder.Entity<UserRole>(entity =>
        {
            entity.ToTable("user_roles");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.OrganizationId).HasColumnName("organization_id");
            entity.Property(x => x.Role).HasColumnName("role").HasConversion(AppRoleConverter).HasMaxLength(64);
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Ignore(x => x.UpdatedAt);

            entity.HasOne(x => x.User)
                .WithMany(u => u.Roles)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Organization)
                .WithMany(o => o.UserRoles)
                .HasForeignKey(x => x.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Project>(entity =>
        {
            entity.ToTable("projects");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.OrganizationId).HasColumnName("organization_id");
            entity.Property(x => x.Title).HasColumnName("title").HasMaxLength(255).IsRequired();
            entity.Property(x => x.Description).HasColumnName("description");
            entity.Property(x => x.Status).HasColumnName("status").HasConversion(ProjectStatusConverter).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Priority).HasColumnName("priority").HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(x => x.StartDate).HasColumnName("start_date");
            entity.Property(x => x.EndDate).HasColumnName("end_date");
            entity.Property(x => x.CreatedByUserId).HasColumnName("created_by");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(x => x.Organization)
                .WithMany(o => o.Projects)
                .HasForeignKey(x => x.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.CreatedByUser)
                .WithMany(u => u.CreatedProjects)
                .HasForeignKey(x => x.CreatedByUserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProjectMember>(entity =>
        {
            entity.ToTable("project_members");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.ProjectId).HasColumnName("project_id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.MemberRole).HasColumnName("member_role").HasConversion<string>().HasMaxLength(32).IsRequired();
            entity.Property(x => x.JoinedAt).HasColumnName("joined_at");

            entity.HasOne(x => x.Project)
                .WithMany(x => x.Members)
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.User)
                .WithMany(x => x.ProjectMemberships)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => new { x.ProjectId, x.UserId }).IsUnique();
        });

        modelBuilder.Entity<ProjectTask>(entity =>
        {
            entity.ToTable("project_tasks");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.ProjectId).HasColumnName("project_id");
            entity.Property(x => x.Title).HasColumnName("title").HasMaxLength(255).IsRequired();
            entity.Property(x => x.Description).HasColumnName("description");
            entity.Property(x => x.AssignedToUserId).HasColumnName("assigned_to_user_id");
            entity.Property(x => x.AssignedByUserId).HasColumnName("assigned_by_user_id");
            entity.Property(x => x.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(x => x.Priority).HasColumnName("priority").HasConversion<string>().HasMaxLength(50).IsRequired();
            entity.Property(x => x.DueDate).HasColumnName("due_date");
            entity.Property(x => x.CompletedAt).HasColumnName("completed_at");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(x => x.Project)
                .WithMany(x => x.Tasks)
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.AssignedToUser)
                .WithMany(x => x.AssignedTasks)
                .HasForeignKey(x => x.AssignedToUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.AssignedByUser)
                .WithMany(x => x.AssignedByTasks)
                .HasForeignKey(x => x.AssignedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TaskComment>(entity =>
        {
            entity.ToTable("task_comments");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.TaskId).HasColumnName("task_id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.Comment).HasColumnName("comment").IsRequired();
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");

            entity.HasOne(x => x.Task)
                .WithMany(x => x.Comments)
                .HasForeignKey(x => x.TaskId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.User)
                .WithMany(x => x.TaskComments)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Milestone>(entity =>
        {
            entity.ToTable("milestones");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.ProjectId).HasColumnName("project_id");
            entity.Property(x => x.Title).HasColumnName("title").HasMaxLength(255).IsRequired();
            entity.Property(x => x.Description).HasColumnName("description");
            entity.Property(x => x.DueDate).HasColumnName("due_date");
            entity.Property(x => x.IsCompleted).HasColumnName("is_completed");
            entity.Property(x => x.CompletedAt).HasColumnName("completed_at");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");

            entity.HasOne(x => x.Project)
                .WithMany(x => x.Milestones)
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProjectStatusHistory>(entity =>
        {
            entity.ToTable("project_status_history");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.ProjectId).HasColumnName("project_id");
            entity.Property(x => x.ChangedByUserId).HasColumnName("changed_by_user_id");
            entity.Property(x => x.OldStatus).HasColumnName("old_status").HasMaxLength(50).IsRequired();
            entity.Property(x => x.NewStatus).HasColumnName("new_status").HasMaxLength(50).IsRequired();
            entity.Property(x => x.ChangedAt).HasColumnName("changed_at");
            entity.Property(x => x.Remarks).HasColumnName("remarks").HasMaxLength(500);

            entity.HasOne(x => x.Project)
                .WithMany(x => x.StatusHistory)
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.ChangedByUser)
                .WithMany(x => x.ProjectStatusChanges)
                .HasForeignKey(x => x.ChangedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ActivityLog>(entity =>
        {
            entity.ToTable("activity_logs");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.ActorId).HasColumnName("actor_id");
            entity.Property(x => x.OrganizationId).HasColumnName("org_id");
            entity.Property(x => x.Action).HasColumnName("action").HasMaxLength(120).IsRequired();
            entity.Property(x => x.EntityType).HasColumnName("entity_type").HasMaxLength(50);
            entity.Property(x => x.EntityId).HasColumnName("entity_id");
            entity.Property(x => x.Metadata).HasColumnName("metadata");
            entity.Property(x => x.Severity).HasColumnName("severity").HasMaxLength(20).IsRequired();
            entity.Property(x => x.IpAddress).HasColumnName("ip_address").HasMaxLength(45);
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Ignore(x => x.UpdatedAt);
        });

        modelBuilder.Entity<SecurityEvent>(entity =>
        {
            entity.ToTable("security_events");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.EventType).HasColumnName("event_type").HasConversion<string>().HasMaxLength(64).IsRequired();
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.IPAddress).HasColumnName("ip_address").HasMaxLength(45);
            entity.Property(x => x.UserAgent).HasColumnName("user_agent").HasMaxLength(512);
            entity.Property(x => x.RequestPath).HasColumnName("request_path").HasMaxLength(255).IsRequired();
            entity.Property(x => x.RequestMethod).HasColumnName("request_method").HasMaxLength(16).IsRequired();
            entity.Property(x => x.Details).HasColumnName("details");
            entity.Property(x => x.Severity).HasColumnName("severity").HasConversion<string>().HasMaxLength(20).IsRequired();
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.IPAddress);
            entity.HasIndex(x => x.CreatedAt);
            entity.HasIndex(x => x.EventType);
        });

        modelBuilder.Entity<FailedLoginAttempt>(entity =>
        {
            entity.ToTable("failed_login_attempts");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.Email).HasColumnName("email").HasMaxLength(254).IsRequired();
            entity.Property(x => x.IPAddress).HasColumnName("ip_address").HasMaxLength(45);
            entity.Property(x => x.AttemptedAt).HasColumnName("attempted_at");
            entity.Property(x => x.IsAccountLock).HasColumnName("is_account_lock");
            entity.Property(x => x.LockExpiresAt).HasColumnName("lock_expires_at");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            entity.HasIndex(x => x.Email);
            entity.HasIndex(x => x.IPAddress);
            entity.HasIndex(x => x.AttemptedAt);
        });

        modelBuilder.Entity<UnmaskRequest>(entity =>
        {
            entity.ToTable("unmask_requests");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.RequestedByUserId).HasColumnName("requested_by_user_id");
            entity.Property(x => x.TargetUserId).HasColumnName("target_user_id");
            entity.Property(x => x.FieldName).HasColumnName("field_name").HasMaxLength(64).IsRequired();
            entity.Property(x => x.VerificationToken).HasColumnName("verification_token").HasMaxLength(1024).IsRequired();
            entity.Property(x => x.TokenExpiry).HasColumnName("token_expiry");
            entity.Property(x => x.IsUsed).HasColumnName("is_used");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(x => x.RequestedByUser)
                .WithMany()
                .HasForeignKey(x => x.RequestedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.TargetUser)
                .WithMany()
                .HasForeignKey(x => x.TargetUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(x => x.RequestedByUserId);
            entity.HasIndex(x => x.TargetUserId);
            entity.HasIndex(x => x.TokenExpiry);
        });

        modelBuilder.Entity<UnmaskLog>(entity =>
        {
            entity.ToTable("unmask_logs");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.TargetUserId).HasColumnName("target_user_id");
            entity.Property(x => x.FieldName).HasColumnName("field_name").HasMaxLength(64).IsRequired();
            entity.Property(x => x.IPAddress).HasColumnName("ip_address").HasMaxLength(45);
            entity.Property(x => x.UserAgent).HasColumnName("user_agent").HasMaxLength(512);
            entity.Property(x => x.Timestamp).HasColumnName("timestamp");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.TargetUser)
                .WithMany()
                .HasForeignKey(x => x.TargetUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.TargetUserId);
            entity.HasIndex(x => x.Timestamp);
        });

        modelBuilder.Entity<AuthenticationLog>(entity =>
        {
            entity.ToTable("authentication_logs");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.Email).HasColumnName("email").HasMaxLength(254).IsRequired();
            entity.Property(x => x.EventType).HasColumnName("event_type").HasConversion<string>().HasMaxLength(40).IsRequired();
            entity.Property(x => x.IPAddress).HasColumnName("ip_address").HasMaxLength(45);
            entity.Property(x => x.UserAgent).HasColumnName("user_agent").HasMaxLength(512);
            entity.Property(x => x.Location).HasColumnName("location").HasMaxLength(128);
            entity.Property(x => x.FailureReason).HasColumnName("failure_reason").HasMaxLength(255);
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.IPAddress);
            entity.HasIndex(x => x.CreatedAt);
            entity.HasIndex(x => x.EventType);
        });

        modelBuilder.Entity<OrganizationSubscription>(entity =>
        {
            entity.ToTable("organization_subscriptions");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.OrganizationId).HasColumnName("organization_id");
            entity.Property(x => x.Plan).HasColumnName("plan").HasMaxLength(50).IsRequired();
            entity.Property(x => x.Status).HasColumnName("status").HasMaxLength(50).IsRequired();
            entity.Property(x => x.StartDate).HasColumnName("start_date");
            entity.Property(x => x.EndDate).HasColumnName("end_date");
            entity.Property(x => x.BillingCycle).HasColumnName("billing_cycle").HasMaxLength(20).IsRequired();
            entity.Property(x => x.Amount).HasColumnName("amount").HasColumnType("decimal(18,2)");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(x => x.Organization)
                .WithMany(x => x.Subscriptions)
                .HasForeignKey(x => x.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => x.OrganizationId).IsUnique();
        });

        modelBuilder.Entity<PaymentTransaction>(entity =>
        {
            entity.ToTable("payment_transactions");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.OrganizationId).HasColumnName("organization_id");
            entity.Property(x => x.SubscriptionId).HasColumnName("subscription_id");
            entity.Property(x => x.ReferenceNumber).HasColumnName("reference_number").HasMaxLength(80).IsRequired();
            entity.Property(x => x.Amount).HasColumnName("amount").HasColumnType("decimal(18,2)");
            entity.Property(x => x.Method).HasColumnName("method").HasMaxLength(40).IsRequired();
            entity.Property(x => x.Status).HasColumnName("status").HasMaxLength(40).IsRequired();
            entity.Property(x => x.Description).HasColumnName("description");
            entity.Property(x => x.BillingPeriodStart).HasColumnName("billing_period_start");
            entity.Property(x => x.BillingPeriodEnd).HasColumnName("billing_period_end");
            entity.Property(x => x.GatewayMessage).HasColumnName("gateway_message");
            entity.Property(x => x.PaidAt).HasColumnName("paid_at");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(x => x.Organization)
                .WithMany(x => x.Payments)
                .HasForeignKey(x => x.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Subscription)
                .WithMany(x => x.Payments)
                .HasForeignKey(x => x.SubscriptionId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(x => x.ReferenceNumber).IsUnique();
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => x.PaidAt);
        });

        modelBuilder.Entity<Document>(entity =>
        {
            entity.ToTable("documents");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.Title).HasColumnName("title").HasMaxLength(255).IsRequired();
            entity.Property(x => x.Description).HasColumnName("description");
            entity.Property(x => x.References).HasColumnName("references_text");
            entity.Property(x => x.FileName).HasColumnName("file_name").HasMaxLength(255).IsRequired();
            entity.Property(x => x.OriginalFileName).HasColumnName("original_file_name").HasMaxLength(255).IsRequired();
            entity.Property(x => x.FilePath).HasColumnName("file_path").HasMaxLength(500).IsRequired();
            entity.Property(x => x.FileSize).HasColumnName("file_size");
            entity.Property(x => x.FileType).HasColumnName("file_type").HasMaxLength(120).IsRequired();
            entity.Property(x => x.FileExtension).HasColumnName("file_extension").HasMaxLength(20).IsRequired();
            entity.Property(x => x.ProjectId).HasColumnName("project_id");
            entity.Property(x => x.CategoryId).HasColumnName("category_id");
            entity.Property(x => x.UploadedByUserId).HasColumnName("uploaded_by_user_id");
            entity.Property(x => x.OrganizationId).HasColumnName("organization_id");
            entity.Property(x => x.Version).HasColumnName("version").HasDefaultValue(1);
            entity.Property(x => x.IsArchived).HasColumnName("is_archived").HasDefaultValue(false);
            entity.Property(x => x.DeletedAt).HasColumnName("deleted_at");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(x => x.Project)
                .WithMany()
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(x => x.Category)
                .WithMany(x => x.Documents)
                .HasForeignKey(x => x.CategoryId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(x => x.UploadedByUser)
                .WithMany()
                .HasForeignKey(x => x.UploadedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.Organization)
                .WithMany()
                .HasForeignKey(x => x.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => x.OrganizationId);
            entity.HasIndex(x => x.ProjectId);
            entity.HasIndex(x => x.CategoryId);
            entity.HasIndex(x => x.UploadedByUserId);
            entity.HasIndex(x => x.IsArchived);
            entity.HasIndex(x => x.DeletedAt);
            entity.HasIndex(x => x.Title);
        });

        modelBuilder.Entity<DocumentVersion>(entity =>
        {
            entity.ToTable("document_versions");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.DocumentId).HasColumnName("document_id");
            entity.Property(x => x.VersionNumber).HasColumnName("version_number");
            entity.Property(x => x.FileName).HasColumnName("file_name").HasMaxLength(255).IsRequired();
            entity.Property(x => x.FilePath).HasColumnName("file_path").HasMaxLength(500).IsRequired();
            entity.Property(x => x.FileSize).HasColumnName("file_size");
            entity.Property(x => x.UploadedByUserId).HasColumnName("uploaded_by_user_id");
            entity.Property(x => x.ChangeNotes).HasColumnName("change_notes");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Ignore(x => x.UpdatedAt);

            entity.HasOne(x => x.Document)
                .WithMany(x => x.Versions)
                .HasForeignKey(x => x.DocumentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.UploadedByUser)
                .WithMany()
                .HasForeignKey(x => x.UploadedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(x => new { x.DocumentId, x.VersionNumber }).IsUnique();
        });

        modelBuilder.Entity<DocumentCategory>(entity =>
        {
            entity.ToTable("document_categories");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.Name).HasColumnName("name").HasMaxLength(120).IsRequired();
            entity.Property(x => x.Description).HasColumnName("description").HasMaxLength(255);
            entity.Property(x => x.OrganizationId).HasColumnName("organization_id");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");

            entity.HasOne(x => x.Organization)
                .WithMany()
                .HasForeignKey(x => x.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => new { x.OrganizationId, x.Name }).IsUnique();
        });

        modelBuilder.Entity<DocumentTag>(entity =>
        {
            entity.ToTable("document_tags");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.Name).HasColumnName("name").HasMaxLength(80).IsRequired();
            entity.Property(x => x.OrganizationId).HasColumnName("organization_id");

            entity.HasOne(x => x.Organization)
                .WithMany()
                .HasForeignKey(x => x.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => new { x.OrganizationId, x.Name }).IsUnique();
        });

        modelBuilder.Entity<DocumentTagMap>(entity =>
        {
            entity.ToTable("document_tag_map");
            entity.HasKey(x => new { x.DocumentId, x.TagId });
            entity.Property(x => x.DocumentId).HasColumnName("document_id");
            entity.Property(x => x.TagId).HasColumnName("tag_id");

            entity.HasOne(x => x.Document)
                .WithMany(x => x.TagMappings)
                .HasForeignKey(x => x.DocumentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Tag)
                .WithMany(x => x.DocumentMappings)
                .HasForeignKey(x => x.TagId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DocumentAccessLog>(entity =>
        {
            entity.ToTable("document_access_logs");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.DocumentId).HasColumnName("document_id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.Action).HasColumnName("action").HasConversion<string>().HasMaxLength(40).IsRequired();
            entity.Property(x => x.AccessedAt).HasColumnName("accessed_at");
            entity.Property(x => x.IpAddress).HasColumnName("ip_address").HasMaxLength(45);
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Ignore(x => x.UpdatedAt);

            entity.HasOne(x => x.Document)
                .WithMany(x => x.AccessLogs)
                .HasForeignKey(x => x.DocumentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(x => x.DocumentId);
            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.AccessedAt);
        });

        modelBuilder.Entity<Channel>(entity =>
        {
            entity.ToTable("channels");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.Name).HasColumnName("name").HasMaxLength(160).IsRequired();
            entity.Property(x => x.Description).HasColumnName("description");
            entity.Property(x => x.Type).HasColumnName("type").HasConversion<string>().HasMaxLength(40).IsRequired();
            entity.Property(x => x.ProjectId).HasColumnName("project_id");
            entity.Property(x => x.OrganizationId).HasColumnName("organization_id");
            entity.Property(x => x.CreatedByUserId).HasColumnName("created_by_user_id");
            entity.Property(x => x.IsArchived).HasColumnName("is_archived").HasDefaultValue(false);
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(x => x.Project)
                .WithMany()
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(x => x.Organization)
                .WithMany()
                .HasForeignKey(x => x.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.CreatedByUser)
                .WithMany()
                .HasForeignKey(x => x.CreatedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(x => x.OrganizationId);
            entity.HasIndex(x => x.ProjectId);
            entity.HasIndex(x => x.Type);
            entity.HasIndex(x => x.IsArchived);
        });

        modelBuilder.Entity<ChannelMember>(entity =>
        {
            entity.ToTable("channel_members");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.ChannelId).HasColumnName("channel_id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.Role).HasColumnName("role").HasConversion<string>().HasMaxLength(32).IsRequired();
            entity.Property(x => x.JoinedAt).HasColumnName("joined_at");
            entity.Property(x => x.LastReadAt).HasColumnName("last_read_at");

            entity.HasOne(x => x.Channel)
                .WithMany(x => x.Members)
                .HasForeignKey(x => x.ChannelId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => new { x.ChannelId, x.UserId }).IsUnique();
            entity.HasIndex(x => x.UserId);
        });

        modelBuilder.Entity<Message>(entity =>
        {
            entity.ToTable("messages");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.ChannelId).HasColumnName("channel_id");
            entity.Property(x => x.SenderId).HasColumnName("sender_id");
            entity.Property(x => x.Content).HasColumnName("content").IsRequired();
            entity.Property(x => x.Type).HasColumnName("type").HasConversion<string>().HasMaxLength(32).IsRequired();
            entity.Property(x => x.ParentMessageId).HasColumnName("parent_message_id");
            entity.Property(x => x.IsEdited).HasColumnName("is_edited").HasDefaultValue(false);
            entity.Property(x => x.EditedAt).HasColumnName("edited_at");
            entity.Property(x => x.IsPinned).HasColumnName("is_pinned").HasDefaultValue(false);
            entity.Property(x => x.IsDeleted).HasColumnName("is_deleted").HasDefaultValue(false);
            entity.Property(x => x.DeletedAt).HasColumnName("deleted_at");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(x => x.Channel)
                .WithMany(x => x.Messages)
                .HasForeignKey(x => x.ChannelId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Sender)
                .WithMany()
                .HasForeignKey(x => x.SenderId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.ParentMessage)
                .WithMany(x => x.Replies)
                .HasForeignKey(x => x.ParentMessageId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(x => x.ChannelId);
            entity.HasIndex(x => x.SenderId);
            entity.HasIndex(x => x.ParentMessageId);
            entity.HasIndex(x => x.IsPinned);
            entity.HasIndex(x => x.CreatedAt);
        });

        modelBuilder.Entity<MessageAttachment>(entity =>
        {
            entity.ToTable("message_attachments");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.MessageId).HasColumnName("message_id");
            entity.Property(x => x.FileName).HasColumnName("file_name").HasMaxLength(255).IsRequired();
            entity.Property(x => x.OriginalFileName).HasColumnName("original_file_name").HasMaxLength(255).IsRequired();
            entity.Property(x => x.FilePath).HasColumnName("file_path").HasMaxLength(500).IsRequired();
            entity.Property(x => x.FileSize).HasColumnName("file_size");
            entity.Property(x => x.FileType).HasColumnName("file_type").HasMaxLength(120).IsRequired();
            entity.Property(x => x.UploadedAt).HasColumnName("uploaded_at");

            entity.HasOne(x => x.Message)
                .WithMany(x => x.Attachments)
                .HasForeignKey(x => x.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => x.MessageId);
        });

        modelBuilder.Entity<MessageReaction>(entity =>
        {
            entity.ToTable("message_reactions");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.MessageId).HasColumnName("message_id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.Emoji).HasColumnName("emoji").HasMaxLength(32).IsRequired();
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");

            entity.HasOne(x => x.Message)
                .WithMany(x => x.Reactions)
                .HasForeignKey(x => x.MessageId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => new { x.MessageId, x.UserId, x.Emoji }).IsUnique();
        });

        modelBuilder.Entity<Announcement>(entity =>
        {
            entity.ToTable("announcements");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.Title).HasColumnName("title").HasMaxLength(255).IsRequired();
            entity.Property(x => x.Content).HasColumnName("content").IsRequired();
            entity.Property(x => x.PostedByUserId).HasColumnName("posted_by_user_id");
            entity.Property(x => x.OrganizationId).HasColumnName("organization_id");
            entity.Property(x => x.ProjectId).HasColumnName("project_id");
            entity.Property(x => x.Priority).HasColumnName("priority").HasConversion<string>().HasMaxLength(32).IsRequired();
            entity.Property(x => x.IsPublished).HasColumnName("is_published").HasDefaultValue(false);
            entity.Property(x => x.PublishedAt).HasColumnName("published_at");
            entity.Property(x => x.ExpiresAt).HasColumnName("expires_at");
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Property(x => x.UpdatedAt).HasColumnName("updated_at");

            entity.HasOne(x => x.PostedByUser)
                .WithMany()
                .HasForeignKey(x => x.PostedByUserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.Organization)
                .WithMany()
                .HasForeignKey(x => x.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Project)
                .WithMany()
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(x => x.OrganizationId);
            entity.HasIndex(x => x.ProjectId);
            entity.HasIndex(x => x.IsPublished);
            entity.HasIndex(x => x.PublishedAt);
        });

        modelBuilder.Entity<AnnouncementReadReceipt>(entity =>
        {
            entity.ToTable("announcement_read_receipts");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.AnnouncementId).HasColumnName("announcement_id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.ReadAt).HasColumnName("read_at");

            entity.HasOne(x => x.Announcement)
                .WithMany(x => x.ReadReceipts)
                .HasForeignKey(x => x.AnnouncementId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => new { x.AnnouncementId, x.UserId }).IsUnique();
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.ToTable("notifications");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnName("id");
            entity.Property(x => x.UserId).HasColumnName("user_id");
            entity.Property(x => x.Title).HasColumnName("title").HasMaxLength(255).IsRequired();
            entity.Property(x => x.Message).HasColumnName("message").HasMaxLength(500).IsRequired();
            entity.Property(x => x.Type).HasColumnName("type").HasConversion<string>().HasMaxLength(40).IsRequired();
            entity.Property(x => x.ReferenceId).HasColumnName("reference_id");
            entity.Property(x => x.ReferenceType).HasColumnName("reference_type").HasMaxLength(80);
            entity.Property(x => x.IsRead).HasColumnName("is_read").HasDefaultValue(false);
            entity.Property(x => x.CreatedAt).HasColumnName("created_at");
            entity.Ignore(x => x.UpdatedAt);

            entity.HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.IsRead);
            entity.HasIndex(x => x.CreatedAt);
        });

        base.OnModelCreating(modelBuilder);
    }

    private static AppRole ParseAppRole(string value)
    {
        var normalized = value.Replace("_", string.Empty).Replace(" ", string.Empty).Trim().ToLowerInvariant();

        return normalized switch
        {
            "superadmin" or "superadministrator" => AppRole.SuperAdmin,
            "systemadmin" or "systemadministrator" or "companyadmin" or "companyadministrator" => AppRole.SystemAdmin,
            "projectmanager" => AppRole.ProjectManager,
            _ => AppRole.TeamMember
        };
    }

    private static string ConvertAppRoleToDatabase(AppRole role)
    {
        return role switch
        {
            AppRole.SuperAdmin => "super_admin",
            AppRole.SystemAdmin => "system_admin",
            AppRole.ProjectManager => "project_manager",
            _ => "team_member"
        };
    }

    private static ProjectStatus ParseProjectStatus(string value)
    {
        var normalized = value.Replace("_", string.Empty).Replace(" ", string.Empty).Trim().ToLowerInvariant();

        return normalized switch
        {
            "planning" or "draft" => ProjectStatus.Draft,
            "active" => ProjectStatus.Active,
            "onhold" => ProjectStatus.OnHold,
            "completed" => ProjectStatus.Completed,
            "cancelled" => ProjectStatus.Cancelled,
            _ => ProjectStatus.Draft
        };
    }

    private static string ConvertProjectStatusToDatabase(ProjectStatus status)
    {
        return status switch
        {
            ProjectStatus.Draft => "Planning",
            ProjectStatus.OnHold => "On Hold",
            _ => status.ToString()
        };
    }
}
