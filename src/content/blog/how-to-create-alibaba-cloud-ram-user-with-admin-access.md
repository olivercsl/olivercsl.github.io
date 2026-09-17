---
title: "How to create an Alibaba Cloud RAM user with administrator access"
description: "Step by step: create a RAM user for Cloudzeta, grant it the AdministratorAccess policy, copy its User Logon Name and Logon Password, and hand both over securely. Based on Alibaba Cloud documentation."
published: 2026-09-17
topic: "Alibaba Cloud"
readingMinutes: 5
author: "Oliver Zhang"
---

To manage your Alibaba Cloud account, Cloudzeta needs to sign in to it. The safe way to allow that is a dedicated RAM user: a separate identity under your account, with its own logon name and password, that you control and can remove at any time. Your account owner credentials stay with you.

This guide walks through the four steps, following Alibaba Cloud's Resource Access Management (RAM) documentation: create the user, grant it administrator access, collect its sign-in details, and send them to Cloudzeta. It takes about five minutes.

## Before you start

Sign in to the [RAM console](https://ram.console.alibabacloud.com/) with your Alibaba Cloud account, or as a RAM user that already has the `AliyunRAMFullAccess` policy. Alibaba Cloud's documentation requires one of the two to create users and grant permissions.

## Step 1: Create the RAM user

1. In the left-side navigation pane, choose **Identities** &gt; **Users**, then click **Create User**.
2. In **Logon Name**, enter a name that identifies us, such as `cloudzeta`. Alibaba Cloud allows up to 64 characters: letters, digits, periods, hyphens and underscores.
3. In **Display Name**, enter something recognisable, such as `Cloudzeta Solutions`. This is optional.
4. If the form asks for an **email address**, you can leave it blank. It is optional and not needed for us to sign in. The logon name contains an @, but it is not an email address.
5. Under **Access Mode**, select **Console Access**.
6. For the logon password, choose to generate it automatically, and select the option requiring a **password reset at next logon**. That way we set our own password on first sign-in, and the one you generated stops working.
7. Leave **MFA** as required. Alibaba Cloud's documentation states that "MFA is required for all users by default", and the user binds an MFA device at first sign-in. We bind our own device when we first sign in, so there is no need to turn it off.
8. Confirm to create the user.

Once the user is created, the console shows its sign-in details in this form:

<pre><code>User Logon Name   <!--email_off-->cloudzeta@1234567890.onaliyun.com<!--/email_off-->
Logon Password    (the generated password)</code></pre>

**Copy both the User Logon Name and the Logon Password before you close that screen.** Alibaba Cloud's documentation states that "the auto-generated password is displayed only once. It cannot be retrieved after you close the panel." If you miss it, see [If you lost the password](#if-you-lost-the-password) below.

## Step 2: Grant administrator access

A new RAM user has no permissions until you grant them. Administrator access comes from the `AdministratorAccess` system policy, which covers all resources in your account, including RAM itself.

1. In the RAM console, choose **Identities** &gt; **Users**.
2. Find the user you created and, in the **Actions** column, click **Attach Policy**. Some console versions label this **Add Permissions**.
3. Set **Resource Scope** to **Account level**, so the access applies across the whole account.
4. In the policy search box, type `AdministratorAccess` and select it. Alibaba Cloud recommends searching for it by name rather than paging through the list.
5. Confirm to grant the permission.

Expect a warning when you select the policy. Alibaba Cloud marks `AdministratorAccess` as a high-risk policy because it grants full control of the account. That warning is expected for this step, and you can confirm it.

## Step 3: Copy the logon name and password

We need both values you copied in Step 1:

- **User Logon Name**, in full, such as <code><!--email_off-->cloudzeta<span>@</span>1234567890.onaliyun.com<!--/email_off--></code>. The name alone is not enough: the part after the `@` is your account's logon suffix, and it tells Alibaba Cloud which account to sign in to.
- **Logon Password**, exactly as generated.

If you copied the password but not the full logon name, you can rebuild it: it is the logon name you chose, followed by `@` and the default logon suffix shown on the **Overview** page of the RAM console.

### If you lost the password

You can generate a new one without recreating the user:

1. Choose **Identities** &gt; **Users**, and click the user's name.
2. Open the **Authentication** tab and click **Modify Logon Settings**.
3. Select **Automatically Regenerate Default Password**, and under **Password Reset** select **Required at Next Logon**.
4. Click **OK**, then copy the new password straight away.

The User Logon Name stays the same; only the password changes.

## Step 4: Send the details to Cloudzeta

Send us both values: the full **User Logon Name** and the **Logon Password**.

**Please send the password securely.** Together with the logon name it gives administrator access to your whole Alibaba Cloud account, so treat it with the same care as the account itself.

Once we have signed in for the first time, we will set our own password and bind our MFA device, and the password you sent will no longer work.

## Staying in control

The RAM user belongs to your account, so you keep full control of it. You can remove the `AdministratorAccess` policy from the user, or delete the user entirely, from the RAM console at any time, and our access ends immediately.

## Sources

The steps above follow Alibaba Cloud's RAM documentation:

- [Create a RAM user](https://www.alibabacloud.com/help/en/ram/user-guide/create-a-ram-user)
- [Grant, view, and revoke RAM user permissions](https://www.alibabacloud.com/help/en/ram/user-guide/grant-permissions-to-the-ram-user)
- [Log on to the Alibaba Cloud Management Console as a RAM user](https://www.alibabacloud.com/help/en/ram/user-guide/log-on-to-the-alibaba-cloud-management-console-as-a-ram-user)
- [Reset a RAM user's console password](https://www.alibabacloud.com/help/en/ram/user-guide/change-the-logon-password-of-a-ram-user-1)

Alibaba Cloud updates its console from time to time, so a label may differ slightly from the wording here. The steps stay the same.
