#!/usr/bin/perl

use warnings;

use strict;

use Bio::EnsEMBL::Registry;

use Bio::EnsEMBL::Compara::Homology;

use Bio::EnsEMBL::Compara::GeneMember;

use Bio::EnsEMBL::Compara::AlignedMember;

use Bio::SeqIO;

use Data::Dumper qw(Dumper);

if (length $ARGV[0] != 15 || $#ARGV != 0) {

    print "Please enter one argument, the EnsEMBL gene id (ex. ENSG00000157601)";

} else {

    my ($stable_id) = @ARGV;

    my $registry = 'Bio::EnsEMBL::Registry';

    print "Connecting to Ensembl..." ; print "\n" ;

    $registry->load_registry_from_db(

      -host => 'useastdb.ensembl.org',

      -user => 'anonymous'

    );

    print 'Succesfully connected to Ensembl Database' ; print "\n" ;


    my $gene_member_adaptor = Bio::EnsEMBL::Registry->get_adaptor('Multi', 'compara', 'GeneMember');

    my $gene_member = $gene_member_adaptor->fetch_by_stable_id($stable_id);



    my $homology_adaptor = Bio::EnsEMBL::Registry->get_adaptor('Multi', 'compara', 'Homology');

    my $homologies = $homology_adaptor->fetch_all_by_Member($gene_member); #homologies = hash array



    my $filename = "list.fasta";

    my $outseq = Bio::SeqIO->new(-file => 'list.fasta', -format => 'Fasta');



    open (my $fh, '>', $filename) or die "Couldn't open file $filename." ;

    foreach my $homology (@{$homologies}) {

      #foreach my $member (@{$homology->get_all_Members}) {

        #can be removed

        #print $fh "DESCRIPTION: ", $member -> description(), "\n" ;

        #print $fh "Stable ID = ", $member -> stable_id() ,"\n" ;

        #print $fh "Name = ", $member -> get_Transcript() ->external_name() ,"\n" ;

        #print $fh $member -> get_Transcript() -> seq()->seq() , "\n" ;

        #print $fh $outseq -> write_seq($member -> get_Transcript() -> seq()) . "\n" ;

      #}

      my @simple_align = $homology->get_SimpleAlign(-SEQ_TYPE => 'exon_cased');

      my $simple_align  = \@simple_align;

      print $fh Dumper $simple_align;

    }

    close $fh;

}
