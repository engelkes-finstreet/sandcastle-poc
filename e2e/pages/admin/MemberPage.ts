import {Locator, Page} from "@playwright/test";
import { BasePage } from "e2e/pages/BasePage";
import { BaseField } from "@finstreet/forms";
import { InviteMemberFormType } from "@/features/members/fsp/forms/memberForm/inviteMemberFormSchema";
import { dataTestIds } from "e2e/data/dataTestIds";
import { InteractiveListHelper } from "e2e/helpers/components/InteractiveListHelper";

export class MemberPage extends BasePage {
    private listHelper: InteractiveListHelper;
    private pendingListHelper: InteractiveListHelper;

    constructor(page: Page) {
        super(page);
        this.listHelper = new InteractiveListHelper(
            page,
            dataTestIds.members.membersList.root,
        );
        this.pendingListHelper = new InteractiveListHelper(
            page,
            dataTestIds.members.pendingInvitations.pendingInvitationsList.root,
        );
    }

    // Complete form filling method
    async fillInviteMemberForm(formData: InviteMemberFormType) {
        await this.form.fillField({
            fieldName: "firstName",
            fieldType: BaseField.INPUT,
            value: formData.firstName,
        });
        await this.form.fillField({
            fieldName: "lastName",
            fieldType: BaseField.INPUT,
            value: formData.lastName,
        });
        await this.form.fillField({
            fieldName: "email",
            fieldType: BaseField.INPUT,
            value: formData.email,
        });
        await this.form.fillField({
            fieldName: "department",
            fieldType: BaseField.SELECT,
            value: formData.department,
        });
        await this.form.fillField({
            fieldName: "signingGroup",
            fieldType: BaseField.RADIO_GROUP,
            value: formData.signingGroup,
        });
        await this.form.fillField({
            fieldName: "conditionsManagement",
            fieldType: BaseField.YES_NO_RADIO_GROUP,
            value: formData.conditionsManagement,
        });
    }

    // Complete workflow methods
    async inviteMember(formData: InviteMemberFormType) {
        await this.clickByTestId(
            dataTestIds.members.inviteMember.inviteMemberButton,
        );
        await this.fillInviteMemberForm(formData);
        await this.clickByTestId(
            dataTestIds.members.inviteMember.inviteMemberConfirmButton,
        );
    }

    async resendInvitation(email: string) {
        await this.clickByTestId(
            dataTestIds.members.resendInvitation.resendInvitationButton(email),
        );
        await this.clickByTestId(
            dataTestIds.members.resendInvitation.resendInvitationConfirmButton,
        );
    }

    async revokeInvitation(email: string) {
        await this.clickByTestId(
            dataTestIds.members.withdrawInvitation.withdrawInvitationButton(email),
        );
    }

    async deleteMember(email: string) {
        await this.clickByTestId(
            dataTestIds.members.deleteMember.deleteMemberButton(email),
        );
        await this.clickByTestId(
            dataTestIds.members.deleteMember.deleteMemberConfirmButton,
        );
    }

    async goToSubstitutes(email: string) {
        // There are two elements with the same data-testid (mobile and desktop versions)
        // We filter by visibility to get the one that's currently shown
        const locator = this.page
            .locator(
                `[data-testid="${dataTestIds.members.substitutes.goToSubstitutesButton(email)}"]`,
            )
            .and(this.page.locator(":visible"));
        await locator.scrollIntoViewIfNeeded();
        await locator.click();
    }

    async getActiveMemberRowByEmail(email: string) {
        return this.listHelper.getListItemByTestId(
            dataTestIds.members.membersList.memberItem(email),
        );
    }

    async getPendingInvitationRowByEmail(email: string) {
        return this.pendingListHelper.getListItemByTestId(
            dataTestIds.members.pendingInvitations.pendingInvitationsList.memberItem(
                email,
            ),
        );
    }

    async findPendingInvitationAcrossPages(email: string, dataTestId: string): Promise<boolean> {
        const next = this.page.locator(`[data-testid="${dataTestId}__group-next"]`);

        while (true) {
            const item = await this.getPendingInvitationRowByEmail(email);
            if ((await item.count()) > 0) {
                return true;
            }

            if (await next.isDisabled()) {
                return false;
            }

            await next.click();
            await this.page.waitForTimeout(3000);
        }
    }

    async findActiveMemberAcrossPages(email: string, dataTestId: string): Promise<Locator> {
        const next = this.page.locator(`[data-testid="${dataTestId}__group-next"]`);
        while (true) {
            const item = await this.getActiveMemberRowByEmail(email);
            if ((await item.count()) > 0 || await next.isDisabled()) {
                return item;
            }
            await next.click();
            await this.page.waitForTimeout(3000);
        }
    }
}
