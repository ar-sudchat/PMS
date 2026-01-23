
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[pms].[customer_contact_records]') AND name = 'attachments')
BEGIN
    ALTER TABLE pms.customer_contact_records ADD attachments NVARCHAR(MAX) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[pms].[manday_assessment_records]') AND name = 'attachments')
BEGIN
    ALTER TABLE pms.manday_assessment_records ADD attachments NVARCHAR(MAX) NULL;
END
GO
