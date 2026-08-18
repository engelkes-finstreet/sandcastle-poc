export const dataTestIds = {
    header: {
        userMenu: {
            root: 'header-user-menu',
            logoutButton: 'header-user-menu-logout-button',
            loginButton: 'header-user-menu-login-button',
        },
    },
    buttons: {
        backButton: "back-button",
        submitButton: "submit-button",
        cancelButton: "cancel-button",
    },
    login: {
        loginButton: 'login-button',
        requestPasswordResetLink: 'request-password-reset-link',
    },
    confirmationModalConfirm: {
        submitButton: "confirmation-modal-submit-button",
    },
    legalRepresentatives: {
        legalRepresentativeCard: "legal-representative-card",
        newLegalRepresentativeButton:
            "legal-representative-new-legal-representative-button",
        confirmLegalRepresentativesButton:
            "legal-representative-confirm-legal-representatives-button",
    },
    menu: {
        trigger: "menu-trigger",
        update: "menu-update",
        delete: "menu-delete",
    },
    requestPasswordReset: {
        submitButton: 'request-password-reset-submit-button',
    },
    resetPassword: {
        submitButton: 'reset-password-submit-button',
    },
    acceptInvitation: {
        submitButton: 'accept-invitation-submit-button',
        information: {
            submitButton: 'accept-invitation-information-submit-button',
        },
    },
    requestAccountUnlock: {
        submitButton: 'request-account-unlock-submit-button',
    },
    intermediators: {
        intermediatorsList: {
            root: 'intermediators-list',
            searchInput: 'intermediators-list-search-input',
            itemActionMenuButton: 'intermediators-list-item-action-menu-button',
        },
        backToOverviewButton: 'intermediators-back-to-overview-button',
        addIntermediator: {
            addIntermediatorButton: 'add-intermediator-button',
            addIntermediatorConfirmButton: 'add-intermediator-confirm-button',
            addIntermediatorCancelButton: 'add-intermediator-cancel-button',
        },
        deleteIntermediator: {
            deleteIntermediatorButton: 'delete-intermediator-button',
            deleteIntermediatorConfirmButton: 'delete-intermediator-confirm-button',
            deleteIntermediatorCancelButton: 'delete-intermediator-cancel-button',
        },
        editIntermediator: {
            editIntermediatorButton: 'edit-intermediator-button',
            editIntermediatorConfirmButton: 'edit-intermediator-confirm-button',
            editIntermediatorCancelButton: 'edit-intermediator-cancel-button',
        },
        pendingInvitations: {
            pendingInvitationsList: 'intermediator-pending-invitations-list',
            resendInvitation: {
                resendInvitationButton:
                    'intermediator-pending-invitations-resend-invitation-button',
                resendInvitationConfirmButton:
                    'intermediator-pending-invitations-resend-invitation-confirm-button',
                resendInvitationCancelButton:
                    'intermediator-pending-invitations-resend-invitation-cancel-button',
            },
            withdrawInvitation: {
                withdrawInvitationButton:
                    'intermediator-pending-invitations-withdraw-invitation-button',
                withdrawInvitationConfirmButton:
                    'intermediator-pending-invitations-withdraw-invitation-confirm-button',
                withdrawInvitationCancelButton:
                    'intermediator-pending-invitations-withdraw-invitation-cancel-button',
            },
        },
        members: {
            membersList: 'intermediator-members-list',
            multiActionButton: 'intermediator-multi-action-button',
            inviteMember: {
                inviteMemberButton: 'intermediator-multi-action-button__button',
                inviteMemberConfirmButton: 'intermediator-invite-member-confirm-button',
                inviteMemberCancelButton: 'intermediator-invite-member-cancel-button',
            },
            deleteMember: {
                deleteMemberButton: 'intermediator-delete-member-button',
                deleteMemberConfirmButton: 'intermediator-delete-member-confirm-button',
                deleteMemberCancelButton: 'intermediator-delete-member-cancel-button',
            },
        },
    },
    members: {
        membersList: {
            root: "members-list",
            searchInput: "members-list-search-input",
            memberItem: (email: string) => `members-list-item-${email}`,
            memberEmailCell: (email: string) => `members-list-email-${email}`,
            memberDeleteButton: (email: string) => `members-list-delete-${email}`,
        },
        inviteMember: {
            inviteMemberButton: "invite-member-button",
            inviteMemberConfirmButton: "invite-member-confirm-button",
            inviteMemberCancelButton: "invite-member-cancel-button",
        },
        deleteMember: {
            deleteMemberButton: (email: string) => `members-list-delete-${email}`,
            deleteMemberConfirmButton: "delete-member-confirm-button",
            deleteMemberCancelButton: "delete-member-cancel-button",
        },
        substitutes: {
            goToSubstitutesButton: (email: string) =>
                `members-list-substitutes-${email}`,
        },
        addSubstitute: {
            openModalButton: "open-add-substitute-modal-button",
            confirmButton: "add-substitute-confirm-button",
            cancelButton: "add-substitute-cancel-button",
        },
        stopSubstitute: {
            openModalButton: "open-stop-substitute-modal-button",
            confirmButton: "stop-substitute-confirm-button",
            cancelButton: "stop-substitute-cancel-button",
        },
        withdrawInvitation: {
            withdrawInvitationButton: (email: string) =>
                `members-pending-invitations-withdraw-invitation-button-${email}`,
            withdrawInvitationConfirmButton: "withdraw-invitation-confirm-button",
            withdrawInvitationCancelButton: "withdraw-invitation-cancel-button",
        },
        resendInvitation: {
            resendInvitationButton: (email: string) =>
                `members-pending-invitations-resend-invitation-button-${email}`,
            resendInvitationConfirmButton:
                "members-pending-invitations-resend-invitation-confirm-button",
            resendInvitationCancelButton:
                "members-pending-invitations-resend-invitation-cancel-button",
        },
        pendingInvitations: {
            pendingInvitationsList: {
                root: "members-pending-invitations-list",
                memberItem: (email: string) =>
                    `members-pending-invitations-item-${email}`,
                memberEmailCell: (email: string) =>
                    `members-pending-invitations-email-${email}`,
            },
        },
    },
    inquiriesList: {
        root: 'inquiries-list',
        actions: {
            searchInput: 'inquiries-list-search-input',
            groupBySelect: 'inquiries-list-group-by-select',
            sortBySelect: 'inquiries-list-sort-by-select',
            resetButton: 'inquiries-list-reset-button',
        },
    },
    operations: {
      financingCasesList: {
        root: "operations-financing-cases-list",
        item: (id: string) => `operations-financing-cases-list-item-${id}`,
      },
    },
};
