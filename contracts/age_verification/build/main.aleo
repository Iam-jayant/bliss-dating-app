program bliss_age_verification_v1.aleo;

record VerificationRecord:
    owner as address.private;
    verified as boolean.private;

function verify_age:
    input r0 as u8.private;
    gte r0 18u8 into r1;
    assert.eq r1 true;
    cast self.caller true into r2 as VerificationRecord.record;
    output r2 as VerificationRecord.record;

function prove_possession:
    input r0 as VerificationRecord.record;
    assert.eq r0.owner self.caller;
    assert.eq r0.verified true;
    output true as boolean.private;

constructor:
    assert.eq edition 0u16;
